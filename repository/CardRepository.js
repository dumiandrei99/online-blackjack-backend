const { Card } = require ('../models')
const { Op } = require('sequelize');

module.exports = {
    addCard: async function addCard(username, card, value) {
        let addedCard = Card.create({username: username, card: card, value: value});
        return addedCard;
    },

    isAceInHand: function isAceInHand(username) { 
        let aceCards = Card.findOne({
            where: {
                username: username,
                card: {
                    [Op.like]: '%ace%'
                },
                value: 11
            }
        })
        return aceCards;
    },

    setAceValueToOne: function setAceValueToOne(id) {
        Card.update(
            {
                value: 1
            },
            {
                where: {
                    id: id
                }
            }
       )
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
    },

    getCardByUsernameAndCard: async function getCardByUsernameAndCard(username, cardName) {
        let card = Card.findOne({
            where: {
                username: username,
                card: cardName
            }
        })
        return card
    },
}
