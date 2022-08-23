const { Bet } = require ('../models')

module.exports = {
    addBet:  function addBet(username, amount) {
        Bet.create({username: username, amount: amount});
    },

    deleteAllRecords: function deleteAllRecords() {
        Bet.destroy({
            where: {},
            truncate: true
        })
    }
}
