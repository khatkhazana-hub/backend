const mongoose = require('mongoose')

const DatabaseConnection = async () => {
    try {
        await mongoose.connect(process.env.DB_URI)
        console.log(`🌐 Database connected successfully...!`)
    } catch (error) {
        console.log(`Error in Database connection...!`)

    }
}

module.exports = DatabaseConnection