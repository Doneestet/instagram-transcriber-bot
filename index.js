require('dotenv').config()
const TelegramBot = require('node-telegram-bot-api')
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

let bot = null
let retryCount = 0
const MAX_RETRIES = 3

async function startBot() {
	if (retryCount >= MAX_RETRIES) {
		console.error('❌ Max retries reached, shutting down')
		process.exit(1)
	}

	if (bot) {
		try {
			await bot.stopPolling()
		} catch (e) {
			console.log('Error stopping bot:', e)
		}
	}

	try {
		bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
			polling: true,
			timeout: 30,
			limit: 100,
			retryAfter: 5000
		})
		console.log('✅ Bot instance created')
		retryCount = 0
	} catch (e) {
		console.error('❌ Failed to create bot instance:', e)
		process.exit(1)
	}

	bot.on('polling_error', async error => {
		console.log('Polling error:', error.code)
		if (
			error.code === 'ETELEGRAM' &&
			error.message.includes('terminated by other getUpdates request')
		) {
			console.log('⚠️ Conflict detected, waiting and retrying...')
			retryCount++
			await new Promise(resolve => setTimeout(resolve, 5000))
			startBot()
		}
	})

	// Create temp directory if it doesn't exist
	if (!fs.existsSync('./temp')) {
		fs.mkdirSync('./temp')
	}

	async function downloadVideo(url) {
		const videoPath = `./temp/${Date.now()}.mp4`
		console.log('Downloading video from:', url)
		await execPromise(`yt-dlp -o "${videoPath}" ${url}`)
		console.log('✅ Video downloaded successfully')
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
	})
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
	console.log('SIGTERM received. Shutting down gracefully...')
	if (bot) {
		await bot.stopPolling()
	}
	process.exit(0)
})

process.on('SIGINT', async () => {
	console.log('SIGINT received. Shutting down gracefully...')
	if (bot) {
		await bot.stopPolling()
	}
	process.exit(0)
})

// Start the bot
console.log('Starting bot...')
startBot()
console.log('Bot is running...')
