const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

// --- SETUP ---
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
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
    console.error("Critical error reading data file:", err);
    clanData = {};
}

const saveStats = () => {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(clanData, null, 2));
    } catch (err) {
        console.error("Failed to save data:", err);
    }
};

// --- SLASH COMMANDS ---
const commands = [
    {
        name: 'update-member',
        description: 'Update member records',
        options: [
            { name: 'user', type: 6, required: true, description: 'Target Discord user' },
            { name: 'name', type: 3, required: true, description: 'Display name' },
            { name: 'roblox', type: 3, required: true, description: 'Roblox username' },
            { name: 'country', type: 3, required: true, description: 'Country name' },
            { name: 'stage', type: 3, required: true, description: 'Rank stage' },
            { name: 'avatar_url', type: 3, required: true, description: 'Direct image link' }
        ]
    },
    {
        name: 'remove-member',
        description: 'Remove a member from the records',
        options: [
            { name: 'user', type: 6, required: true, description: 'User to remove' }
        ]
    },
    {
        name: 'leaderboard',
        description: 'Display clan leaderboard'
    },
    {
        name: 'say',
        description: 'Broadcast text',
        options: [{ name: 'message', type: 3, required: true, description: 'Text to send' }]
    }
];

// --- REGISTRATION ---
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Absolute Zero commands synchronized.');
    } catch (error) {
        console.error('Command registration failed:', error);
    }
})();

// --- EVENT HANDLERS ---
client.once('ready', () => {
    console.log(`System Online: ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    // UPDATE MEMBER
    if (commandName === 'update-member') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Unauthorized access.', ephemeral: true });
        }

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
        return interaction.reply({ content: 'Record updated successfully.', ephemeral: true });
    }

    // REMOVE MEMBER
    if (commandName === 'remove-member') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Unauthorized access.', ephemeral: true });
        }

        const user = options.getUser('user');

        if (!clanData[user.id]) {
            return interaction.reply({ content: 'User not found in records.', ephemeral: true });
        }

        delete clanData[user.id];
        saveStats();
        return interaction.reply({ content: 'Record erased.', ephemeral: true });
    }

    // LEADERBOARD
    if (commandName === 'leaderboard') {
        try {
            const members = Object.values(clanData);

            if (members.length === 0) {
                return interaction.reply({ content: 'No records found.', ephemeral: true });
            }

            const embeds = members.map((player, index) => {
                return new EmbedBuilder()
                    .setColor(0x2b2d31)
                    .setTitle(`${index + 1} - ${player.name}`)
                    .setDescription(
                        `| ${player.discord} |\n` +
                        `<<<| | ${player.roblox} | |>>>\n\n` +
                        `Country : ${player.country}\n` +
                        `Stage : ${player.stage}`
                    )
                    .setThumbnail(player.avatar);
            });

            return await interaction.reply({ embeds: embeds });
        } catch (error) {
            console.error('Leaderboard error:', error);
            if (!interaction.replied) {
                return interaction.reply({ content: 'Internal system error.', ephemeral: true });
            }
        }
    }

    // SAY
    if (commandName === 'say') {
        if (!interaction.member.permissions.has('ManageMessages')) return;
        const msg = options.getString('message');
        await interaction.channel.send(msg);
        return interaction.reply({ content: 'Broadcast sent.', ephemeral: true });
    }
});

client.login(token);
                
