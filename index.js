const { Client, GatewayIntentBits } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Бот работает!"));
app.listen(8080);


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const userJoinTime = new Map();

client.on("ready", () => {
    console.log(`${client.user.tag} запущен!`);
    console.log("REPLIT_URL:", process.env.REPLIT_URL);
    // Восстанавливаем время входа в голосовые каналы после перезапуска
    client.guilds.cache.forEach(guild => {
        guild.members.cache.forEach(member => {
            if (member.voice.channelId) {
                userJoinTime.set(member.id, Date.now());
            }
        });
    });
});

// Отслеживаем вход в голосовой канал
client.on("voiceStateUpdate", async (oldState, newState) => {
    const userId = newState.member.id; // Теперь берём ID правильно
    const guildId = newState.guild.id; // ID сервера (чтобы разделять данные по серверам)

    // Если пользователь зашёл в голосовой канал
    if (!oldState.channelId && newState.channelId) {
        userJoinTime.set(userId, Date.now());
    }

    // Если пользователь вышел из голосового канала
    if (oldState.channelId && !newState.channelId) {
        if (userJoinTime.has(userId)) {
            const joinTime = userJoinTime.get(userId);
            const timeSpent = Date.now() - joinTime;
            userJoinTime.delete(userId);

            let totalTime = (await db.get(`voiceTime_${guildId}_${userId}`)) || 0;
            totalTime += timeSpent;
            await db.set(`voiceTime_${guildId}_${userId}`, totalTime);
        }
    }
});

client.on("messageCreate", async (message) => {
    if (message.content === "!restart" && message.author.id === "ТВОЙ_DISCORD_ID") {
        await message.reply("Перезагружаюсь... 🔄");
        process.exit(); // Завершает процесс (запускай через nodemon)
    }
});

// Команда для проверки времени
client.on("messageCreate", async (message) => {
    if (message.content === "!voice") {
        const userId = message.author.id;
        const guildId = message.guild.id; // ID сервера
        let totalTime = (await db.get(`voiceTime_${guildId}_${userId}`)) || 0;

        // Если пользователь сейчас в голосовом чате, добавляем текущее время
        const member = message.guild.members.cache.get(userId);
        if (member && member.voice.channelId) {
            const joinTime = userJoinTime.get(userId);
            if (joinTime) {
                totalTime += Date.now() - joinTime;
            }
        }

        const hours = Math.floor(totalTime / 3600000);
        const minutes = Math.floor((totalTime % 3600000) / 60000);
        const seconds = Math.floor((totalTime % 60000) / 1000);

        message.reply(`Ты провёл в голосовых чатах: **${hours}ч ${minutes}м ${seconds}с** (включая текущее время)`);
    }
});

client.login("MTM0NDA0MzI4NzIwNzc0MzYzOA.GbRZmC.ExX9fgjIGSgogWE37LRi2oFp38u0CY-gUWFQ9w");
