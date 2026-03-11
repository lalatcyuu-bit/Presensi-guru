const axios = require("axios")

async function sendWA(target, message) {

  try {

    const res = await axios.post(
      "https://api.fonnte.com/send",
      new URLSearchParams({
        target: target,
        message: message
      }),
      {
        headers: {
          Authorization: process.env.FONNTE_TOKEN
        }
      }
    )

    console.log("WA sent:", res.data)

  } catch (err) {

    console.log("WA error:", err.response?.data || err.message)

  }

}

module.exports = sendWA