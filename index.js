require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
const express = require('express')
const { exec } = require('child_process')
const fs = require('fs')
const OpenAI = require('openai')
const util = require('util')
const execPromise = util.promisify(exec)

// Validate environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
	console.error('❌ TELEGRAM_BOT_TOKEN is not set in environment variables')
	process.exit(1)
}

if (!process.env.OPENAI_API_KEY) {
	console.error('❌ OPENAI_API_KEY is not set in environment variables')
	process.exit(1)
}

console.log('✅ Environment variables validated')
console.log('Bot token:', process.env.TELEGRAM_BOT_TOKEN.slice(0, 5) + '...')

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3000
let bot = null

async function setupBot() {
	try {
		// Create bot instance without polling
		bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })

		// Set webhook URL (Render provides RENDER_EXTERNAL_URL)
		const webhookUrl = `${process.env.RENDER_EXTERNAL_URL}/webhook/${process.env.TELEGRAM_BOT_TOKEN}`
		await bot.setWebHook(webhookUrl)
		console.log('✅ Webhook set to:', webhookUrl)

		// Create temp directory if it doesn't exist
		if (!fs.existsSync('./temp')) {
			fs.mkdirSync('./temp')
		}

		return bot
	} catch (e) {
		console.error('❌ Failed to setup bot:', e)
		throw e
	}
}

async function downloadVideo(url) {
	const videoPath = `./temp/${Date.now()}.mp4`
	console.log('Downloading video from:', url)
	await execPromise(`yt-dlp -o "${videoPath}" ${url}`)
	console.log('✅ Video downloaded successfully')
	return videoPath
}

// Setup webhook endpoint
app.post(`/webhook/${process.env.TELEGRAM_BOT_TOKEN}`, async (req, res) => {
	try {
		const { message } = req.body

		if (!message || !message.text) {
			return res.sendStatus(200)
		}

		const chatId = message.chat.id
		const text = message.text

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
				const openai = new OpenAI({
					apiKey: process.env.OPENAI_API_KEY
				})

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
				console.log('✅ Video processed and transcribed successfully')
			} catch (error) {
				console.error('Error:', error)
				bot.sendMessage(chatId, '❌ Error processing video: ' + error.message)
			}
		}

		res.sendStatus(200)
	} catch (error) {
		console.error('Webhook error:', error)
		res.sendStatus(500)
	}
})

// Health check endpoint
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok' })
})

// Start server and setup bot
async function start() {
	try {
		await setupBot()
		app.listen(PORT, () => {
			console.log(`🚀 Server is running on port ${PORT}`)
		})
	} catch (error) {
		console.error('Failed to start server:', error)
		process.exit(1)
	}
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
	console.log('SIGTERM received. Shutting down gracefully...')
	process.exit(0)
})

process.on('SIGINT', () => {
	console.log('SIGINT received. Shutting down gracefully...')
	process.exit(0)
})

// Start the application
start()
