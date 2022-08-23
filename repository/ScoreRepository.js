const { Score } = require ('../models')

module.exports = {
    addScore:  function addScore(username, score) {
        Score.create({username: username, score: score});
    },

    findScore: async function findScore(username) { 
        let score = Score.findOne({
            where:{
                username: username
            }
        })
        return score
    },

    deleteAllRecords: function deleteAllRecords() {
        Score.destroy({
            where: {},
            truncate: true
        })
    },

    updateScore: function updateScore(username, score) {
        Score.update(
            {
                score: score
            },
            {
                where: {
                    username: username
                }
            }
        )
    }
}
