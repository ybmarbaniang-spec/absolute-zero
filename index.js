const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

// --- SETUP ---
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildExpressions
    ]
});

// --- DATA MANAGEMENT ---
let clanData = {};
const dataPath = './clanData.json';

if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({}, null, 2));
}

try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    clanData = JSON.parse(rawData);
} catch (err) {
    console.error("Data Load Error:", err);
    clanData = {};
}

const saveStats = () => {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(clanData, null, 2));
    } catch (err) {
        console.error("Save Error:", err);
    }
};

// --- SLASH COMMANDS ---
const commands = [
    {
        name: 'update-member',
        description: 'Update member records',
        options: [
            { name: 'user', type: 6, required: true, description: 'Target user' },
            { name: 'name', type: 3, required: true, description: 'Display name' },
            { name: 'roblox', type: 3, required: true, description: 'Roblox username' },
            { name: 'country', type: 3, required: true, description: 'Country name' },
            { name: 'stage', type: 3, required: true, description: 'Rank stage' },
            { name: 'avatar_url', type: 3, required: true, description: 'Image link' }
        ]
    },
    {
        name: 'remove-member',
        description: 'Remove a member from records',
        options: [{ name: 'user', type: 6, required: true, description: 'User to remove' }]
    },
    {
        name: 'leaderboard',
        description: 'Display clan leaderboard'
    },
    {
        name: 'say',
        description: 'Make the bot speak',
        options: [{ name: 'message', type: 3, required: true, description: 'Text to send' }]
    },
    {
        name: 'steal-emoji',
        description: 'Add emoji via URL',
        options: [
            { name: 'url', type: 3, required: true, description: 'Image URL' },
            { name: 'name', type: 3, required: true, description: 'Emoji name' }
        ]
    },
    {
        name: 'kick',
        description: 'Kick a member',
        options: [
            { name: 'user', type: 6, required: true, description: 'Target' },
            { name: 'reason', type: 3, required: false, description: 'Reason' }
        ]
    },
    {
        name: 'ban',
        description: 'Ban a member',
        options: [
            { name: 'user', type: 6, required: true, description: 'Target' },
            { name: 'reason', type: 3, required: false, description: 'Reason' }
        ]
    },
    {
        name: 'quarantine',
        description: 'Isolate a member',
        options: [
            { name: 'user', type: 6, required: true, description: 'Target' },
            { name: 'role_id', type: 3, required: true, description: 'Role ID' }
        ]
    }
];

// --- REGISTRATION ---
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Absolute Zero System Synchronized.');
    } catch (error) {
        console.error('Sync Error:', error);
    }
})();

// --- EVENT HANDLERS ---
client.once('ready', () => console.log(`Online: ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild, member: executor } = interaction;

    // Helper: Hierarchy Check
    const isHigher = (target) => {
        if (!target) return false;
        if (target.id === guild.ownerId) return true;
        return target.roles.highest.position >= executor.roles.highest.position;
    };

    // Helper: Bot Hierarchy Check
    const botIsLower = (target) => {
        return target.roles.highest.position >= guild.members.me.roles.highest.position;
    };

    // --- CLAN MGMT ---
    if (commandName === 'update-member') {
        if (!executor.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
        const user = options.getUser('user');
        clanData[user.id] = {
            name: options.getString('name'),
            discord: user.tag,
            roblox: options.getString('roblox'),
            country: options.getString('country'),
            stage: options.getString('stage'),
            avatar: options.getString('avatar_url')
        };
        saveStats();
        return interaction.reply({ content: 'Record updated.', ephemeral: true });
    }

    if (commandName === 'remove-member') {
        if (!executor.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
        const user = options.getUser('user');
        if (!clanData[user.id]) return interaction.reply({ content: 'User not found.', ephemeral: true });
        delete clanData[user.id];
        saveStats();
        return interaction.reply({ content: 'Record erased.', ephemeral: true });
    }

    if (commandName === 'leaderboard') {
        const members = Object.values(clanData);
        if (members.length === 0) return interaction.reply({ content: 'Records empty.', ephemeral: true });
        
        const embeds = members.slice(0, 10).map((p, i) => new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle(`${i + 1} - ${p.name}`)
            .setDescription(`| ${p.discord} |\n<<<| | ${p.roblox} | |>>>\n\nCountry : ${p.country}\nStage : ${p.stage}`)
            .setThumbnail(p.avatar));
        
        return interaction.reply({ embeds });
    }

    // --- UTILITY ---
    if (commandName === 'say') {
        if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
        const msg = options.getString('message');
        await interaction.channel.send(msg);
        return interaction.reply({ content: 'Sent.', ephemeral: true });
    }

    if (commandName === 'steal-emoji') {
        if (!executor.permissions.has(PermissionFlagsBits.ManageExpressions)) return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
        try {
            await guild.emojis.create({ attachment: options.getString('url'), name: options.getString('name') });
            return interaction.reply({ content: 'Emoji added.', ephemeral: true });
        } catch (e) {
            return interaction.reply({ content: 'Creation failed.', ephemeral: true });
        }
    }

    // --- MODERATION ---
    if (commandName === 'kick' || commandName === 'ban' || commandName === 'quarantine') {
        const target = options.getMember('user');
        const reason = options.getString('reason') || 'No reason provided';

        if (!target) return interaction.reply({ content: 'User not in server.', ephemeral: true });
        if (isHigher(target)) return interaction.reply({ content: 'Hierarchy violation.', ephemeral: true });
        if (botIsLower(target)) return interaction.reply({ content: 'Bot hierarchy insufficient.', ephemeral: true });

        try {
            if (commandName === 'kick') {
                await target.kick(reason);
                return interaction.reply({ content: 'Kicked.', ephemeral: true });
            }
            if (commandName === 'ban') {
                await target.ban({ reason });
                return interaction.reply({ content: 'Banned.', ephemeral: true });
            }
            if (commandName === 'quarantine') {
                const roleId = options.getString('role_id');
                await target.roles.set([roleId]);
                return interaction.reply({ content: 'Quarantined.', ephemeral: true });
            }
        } catch (e) {
            return interaction.reply({ content: 'Action failed.', ephemeral: true });
        }
    }
});

client.login(token);
