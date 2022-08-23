const { Card } = require ('../models')

module.exports = {
    addCard: function addCard(username, card, value) {
        Card.create({username: username, card: card, value: value});
    },

    findCard: async function findCard(cardName) { 
        let card = Card.findOne({
            where:{
                card: cardName
            }
        })
        return card
    },

    deleteAllRecords: function deleteAllRecords() {
        Card.destroy({
            where: {},
            truncate: true
        })
    }
}
