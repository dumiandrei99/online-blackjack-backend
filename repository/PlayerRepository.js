const { Player } = require ('../models')
const { Op } = require('sequelize');

module.exports = {
    createUser:  function createUser(username, socketId, totalCredits, turnToAct) {
        Player.create({username: username, isReady: false, socketId: socketId, totalCredits: totalCredits, turnToAct: turnToAct});
    },

    findOtherConnectedUsers: async function findOtherConnectedUsers(currentUsername) { 
        let user = Player.findOne({
            where:{
                username: {[Op.ne]: currentUsername}
            }
        })

        return user
    },

    getPlayerByTurn: async function getPlayerByTurn(turn) {
        let user = Player.findOne({
            where:{
                turnToAct: turn
            }
        })
        return user
    },

    playerIsReady: function playerIsReady(playerUsername) {
        Player.update(
            {
                isReady: true
            },
            {
                where: {
                    username: playerUsername
                }
            }
        )
    },

    deleteUserByUsername: function deleteUserByUsername(username) { 
        Player.destroy({
            where: {
                username: username
            }
        })
    },

    deleteUserBySocket: function deleteUserBySocket(socketId) { 
        Player.destroy({
            where: {
                socketId: socketId
            }
        })
    },

    getTotalCreditsAmount: async function getTotalCreditsAmount(username) { 
        let user = Player.findOne({
            where:{
                username: username
            }
        })

        return user
    },

    updateTotalCreditsAmount: function updateTotalCreditsAmount(username, amount) {
        Player.update(
            {
                totalCredits: amount
            },
            {
                where: {
                    username: username
                }
            }
        )
    },

    updateTurnToAct: function updateTurnToAct(username) {
        Player.update(
            {
                turnToAct: true
            },
            {
                where: {
                    username: username
                }
            }
        )
    },

    findConnectedUserBySocketId: async function findConnectedUserBySocketId(socketId) {
        let user = Player.findOne({
            where:{
                socketId: socketId
            }
        })
        return user
    },

    findUserByUsername: async function findUserByUsername(username) {
        let user = Player.findOne({
            where:{
                username: username
            }
        })
        return user
    },

    deleteAllRecords: function deleteAllRecords() {
        Player.destroy({
            where: {},
            truncate: true
        })
    },

    findFirstRecord: async function findFirstRecord() {
        let user = Player.findOne({
            order: [ [ 'createdAt', 'ASC' ]],
        });

        return user;
    }

}
