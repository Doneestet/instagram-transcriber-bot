require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const { exec } = require('child_process')
const fs = require('fs')
const OpenAI = require('openai')
const util = require('util')
const execPromise = util.promisify(exec)

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
})

// Create temp directory if it doesn't exist
if (!fs.existsSync('./temp')) {
	fs.mkdirSync('./temp')
}

async function downloadVideo(url) {
	const videoPath = `./temp/${Date.now()}.mp4`
	await execPromise(`yt-dlp -o "${videoPath}" ${url}`)
	return videoPath
}

bot.on('message', async msg => {
	const chatId = msg.chat.id
	const text = msg.text

	if (!text) return

	if (text.includes('instagram.com')) {
		try {
			// Send processing message
			const processingMsg = await bot.sendMessage(
				chatId,
				'🎵 Processing video...'
			)

			// Download video using yt-dlp
			const videoPath = await downloadVideo(text)

			await bot.editMessageText('🎯 Video downloaded, transcribing...', {
				chat_id: chatId,
				message_id: processingMsg.message_id
			})

			// Transcribe video
			const transcription = await openai.audio.transcriptions.create({
				file: fs.createReadStream(videoPath),
				model: 'whisper-1'
			})

			// Send transcription
			await bot.editMessageText(transcription.text, {
				chat_id: chatId,
				message_id: processingMsg.message_id
			})

			// Clean up
			fs.unlinkSync(videoPath)
		} catch (error) {
			console.error('Error:', error)
			bot.sendMessage(chatId, '❌ Error processing video: ' + error.message)
		}
	}
})

console.log('Bot is running...')
