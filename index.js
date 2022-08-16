const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const PORT = 3001
const {Server} = require("socket.io");
const e = require('express');
const { callbackify } = require('util');

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
            callback({
                message: 'USER CONNECTED'
            })
        } else {
            // if there are already 2 players in game, display a "FULL ROOM" error message to the client
            callback({
                message: 'FULL ROOM'
            })
        }
    })

    socket.on("disconnect", () => {
        console.log("User disconnected: " + socket.id)
    })
})

// start server on port
server.listen(PORT, () => {
    console.log("SERVER STARTED ON PORT: " + PORT)
})