const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const PORT = 3001
const {Server} = require("socket.io");
const PlayerRepository = require('./repository/PlayerRepository') 
const BetRepository = require('./repository/BetRepository')
const CardRepository = require('./repository/CardRepository')
const ScoreRepository = require('./repository/ScoreRepository');
const { equal } = require('assert');

const cardNumbersAndValues = {
    'two' : 2,
    'three' : 3,
    'four' : 4,
    'five' : 5,
    'six' : 6,
    'seven' : 7,
    'eight' : 8,
    'nine' : 9,
    'ten' : 10,
    'jack' : 10,
    'queen' : 10,
    'king' : 10,
    'ace' : 11 // or 1, but this will be set when calculating the total for the player
}
const cardColorways = ['hearts', 'spades', 'diamonds', 'clubs']

let cardsGeneratedForDealer = false;

const generateRandomCard = async (username) => {
    let dictionaryKeys = Object.keys(cardNumbersAndValues)
    let randomCardNumber = dictionaryKeys[Math.floor(dictionaryKeys.length * Math.random())];
    let colorway = cardColorways[Math.floor(Math.random() * cardColorways.length)];
    let card = randomCardNumber + "_" + colorway
    let value = cardNumbersAndValues[randomCardNumber];

    // save the generated card to DB
    CardRepository.addCard(username, card, value)

    let cardAndValue = {
        card: card,
        value: value
    }
    return cardAndValue
}
const calculateFirstScore = async (username, cards) => {
    let score = 0;
    for (const [card, cardValue] of Object.entries(cards)) {
        let cardName = card.split("_")
        if (cardName[0] !== 'ace') {
            score += cardValue 
        } else {
            if (score + 11 > 21) {
                score += 1
            } else {
                score += 11;
            }
        }
    }
    ScoreRepository.addScore(username, score)
    return score
}

const calculateScoreOnHit = async (username, card) => {
    let scoreObject = await ScoreRepository.findScore(username)
    let score = scoreObject.score
    for (const [cardNameAndColor, cardValue] of Object.entries(card)) {
        let cardName = cardNameAndColor.split("_")
        if (cardName[0] !== 'ace') {
            score += cardValue 
        } else {
            if (score + 11 > 21) {
                score += 1
            } else {
                score += 11;
            }
        }
    }
    ScoreRepository.updateScore(username, score)
    return score
}

// resolve most of the cors issues
app.use(cors());
// generate the server
const server = http.createServer(app)

// set up the socket.io server
const io = new Server(server, {
    cors: {
        // accept requests from the React client
        origin: "http://localhost:3000",
    }
} )

io.on("connection", (socket) => {

    console.log("User connected: " + socket.id);

    // join to the blackjack game
    socket.on("join-game", (username, callback) => {
        // initial number of players connected to the blackjack game is 0
        let numberOfPlayersConnected = 0;
    
        // if the room is not defined yet, it means that nobody joined the game yet, so the size of the room at this moment is 0 (no players joined)
        if (io.sockets.adapter.rooms.get('1') !== undefined) { 
            numberOfPlayersConnected = io.sockets.adapter.rooms.get('1').size
        }
        
        // since we only allow to players in the game (not counting the dealer), we check if the number of connected players is less than 2
        if (numberOfPlayersConnected < 2) {

            // if it is, we connect the player to the selected room (in this case, we hardcoded the room name to "1")
            socket.join("1")
            // add the connected user in the DB
            // set it's turn to act whenever the round starts, if he is the first to join the room
            if (numberOfPlayersConnected === 0) {
                PlayerRepository.createUser(username, socket.id, 500, 1);
            } else {
                // add the last user and the dealer and start the game
                PlayerRepository.createUser(username, socket.id, 500, 2);
                PlayerRepository.createUser("dealer", socket.id, 0, 3);
            }
            // send to the room that a new user has connected
            socket.to("1").emit("user_connected", username)
            // return the user already connected in room (if any)
            PlayerRepository.findOtherConnectedUsers(username).then(user => {
                // if there is no other connected user, return an empty string
                let connectedUser = "" 
                let isReady = false
                if (user !== null) {
                    connectedUser = user.username
                    isReady = user.isReady
                }
                callback({
                    message: 'USER CONNECTED',
                    connectedUser: connectedUser,
                    isReady: isReady,
                })
            })
        } else {
            // if there are already 2 players in game, display a "FULL ROOM" error message to the client
            callback({
                message: 'FULL ROOM'
            })
        }
    })

    // user presses the "ready" button
    socket.on("user-ready", (username) => {
        // update the player that's ready in the DB
        PlayerRepository.playerIsReady(username)
        // tell to the other user that you're ready
        socket.to("1").emit("other_user_ready")
    })

    // user places a bet
    socket.on("placed-bet", (usernameAndBet) => {
        const username = usernameAndBet.username
        const betAmount = usernameAndBet.bet

        // save bet in table
        BetRepository.addBet(username, betAmount)
        // update the player total amount
        PlayerRepository.getTotalCreditsAmount(username).then((user) => {
            const updatedTotalCredits = user.totalCredits - betAmount
            PlayerRepository.updateTotalCreditsAmount(username, updatedTotalCredits)
          
            const totalAmountAndPlacedBet = { 
                totalCredits: updatedTotalCredits,
                betAmount: betAmount
            }
            
            // tell to the other user that you've placed a bet
            socket.to("1").emit("placed_bet", totalAmountAndPlacedBet)
        })
    })

    socket.on("generate-dealer-cards", async (username, callback) => {
        // // we need to generate the card for the dealer only once
        // // so we'll check if the user doing the request
        // // is the first one introduced in the DB
        // let firstUser = await PlayerRepository.findFirstRecord();
        // let user = await PlayerRepository.findUserByUsername(username)
        //if (firstUser.username === user.username) {
            cardsGeneratedForDealer = true
            let dealerCards = {}
            let card = await generateRandomCard("dealer")
            dealerCards[card.card] = card.value

            score = await calculateFirstScore("dealer", dealerCards)

            socket.to("1").emit("set_other_player_dealer_cards", {dealerCards: dealerCards, score: score})
            callback({
                dealerCards: dealerCards,
                score: score
            })
        //}
    })

    socket.on("generate-player-cards", async (username, callback) => { 
        let cards = {}
        for (let i = 0 ; i < 2 ; i++) {
            let card = await generateRandomCard(username)
            // don't generate the same two cards on the first hand (for example, both cards would be Aces of Spades)
            if (i === 1) {
                if (card === card.card) {
                    while (card !== card.card) {
                        card = await generateRandomCard(username)
                    }
                }
            }
            cards[card.card] = card.value
        }

        score = await calculateFirstScore(username, cards)
        
        socket.to("1").emit("set_other_player_cards", {cards: cards, score: score})
        callback({
            cards: cards,
            score: score
        })
    })

    socket.on("generate-card", async (username, callback) => {
        let card = {}
        let randomCard = await generateRandomCard(username)
        card[randomCard.card] = randomCard.value
        score = await calculateScoreOnHit(username, card)
        socket.to("1").emit("opponent_hit_new_card", {card: card, score: score})
        callback({
            card: card,
            score: score
        })
    })

    socket.on("generate-dealer-card", async (username, callback) => { 
        // we need to generate the card for the dealer only once
        // so we'll check if the user doing the request
        // is the first one introduced in the DB
        let firstUser = await PlayerRepository.findFirstRecord();
        let user = await PlayerRepository.findUserByUsername(username)
        if (user.username === firstUser.username) {
            let card = {}
            let randomCard = await generateRandomCard("dealer")
            card[randomCard.card] = randomCard.value
            score = await calculateScoreOnHit("dealer", card)
            socket.to("1").emit("opponent_dealer_card", {card: card, score: score})
            callback({
                card: card,
                score: score
            }) 
        } 
    })

    socket.on("player-turn", async (turn, callback) => {
        console.log("turn: " + turn)
        let player = await PlayerRepository.getPlayerByTurn(turn)
        console.log(player.username)
        
        socket.emit("player_turn", {username:player.username, turn: turn})
        socket.to("1").emit("player_turn", {username: player.username, turn: turn})
        callback({
            username: player.username
        })
    })

    socket.on("set-other-user-bust", () => {
        socket.to("1").emit("set_other_user_bust", {outcome : "BUST"})
    })

    socket.on("set-other-user-blackjack", () => {
        socket.to("1").emit("set_other_user_blackjack", {outcome : "BLACKJACK"})
    })

    socket.on("set-other-user-stand", () => {
        socket.to("1").emit("set_other_user_stand", {outcome : "STAND"})
    })

    socket.on("set-other-dealer-bust", () => {
        socket.to("1").emit("set_other_dealer_bust", {outcome : "BUST"})
    })

    socket.on("set-other-dealer-blackjack", () => {
        socket.to("1").emit("set_other_dealer_blackjack", {outcome : "BLACKJACK"})
    })

    socket.on("set-other-dealer-stand", () => {
        socket.to("1").emit("set_other_dealer_stand", {outcome : "STAND"})
    })

    // leave the room when player goes back in page 
    socket.on("leave-room", (username) => {
        // remove the user from the DB when disconnecting
        PlayerRepository.deleteUserByUsername(username)
        CardRepository.deleteAllRecords()
        BetRepository.deleteAllRecords()
        ScoreRepository.deleteAllRecords()
        PlayerRepository.deleteAllRecords()
        cardsGeneratedForDealer = false
        //alert the room that the user has disconnected
        socket.to("1").emit("user_disconnected")
        // remove the user from the socket
        socket.leave("1")
        console.log(username + " disconnected from room")
    })

    socket.on("disconnect", async () => {
        // remove the user from the DB when disconnecting
        let isUserConnectedToTheGame = await PlayerRepository.findConnectedUserBySocketId(socket.id)
        if (isUserConnectedToTheGame !== null) {
            PlayerRepository.deleteUserBySocket(socket.id)
            CardRepository.deleteAllRecords()
            BetRepository.deleteAllRecords()
            ScoreRepository.deleteAllRecords()
            PlayerRepository.deleteAllRecords()
            cardsGeneratedForDealer = false
            //alert the room that the user has disconnected
            socket.to("1").emit("user_disconnected")
        }
        console.log("User disconnected: " + socket.id)
    })
})

// start server on port
server.listen(PORT, () => {
    console.log("SERVER STARTED ON PORT: " + PORT)
})