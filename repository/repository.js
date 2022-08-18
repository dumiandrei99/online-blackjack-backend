const { Player } = require ('../models')
const { Op } = require('sequelize');

module.exports = {
    createUser:  function createUser(username, socketId) {
        Player.create({username: username, isReady: false, socketId: socketId});
    },

    findOtherConnectedUsers: async function findOtherConnectedUsers(currentUsername) { 
        let user = Player.findOne({
            where:{
                username: {[Op.ne]: currentUsername}
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
    }

}
