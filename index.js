const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

// --- CONFIGURATION ---
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // Your Absolute Zero Server ID

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- DATA PERSISTENCE ---
let clanData = {};
if (fs.existsSync('./clanData.json')) {
    clanData = JSON.parse(fs.readFileSync('./clanData.json', 'utf-8'));
}

const saveStats = () => {
    fs.writeFileSync('./clanData.json', JSON.stringify(clanData, null, 2));
};

// --- COMMAND DEFINITIONS ---
const commands = [
    {
        name: 'update-member',
        description: 'Add or update a member on the leaderboard',
        options: [
            { name: 'user', type: 6, required: true, description: 'The Discord member' },
            { name: 'name', type: 3, required: true, description: 'Display name (e.g. Diablo)' },
            { name: 'roblox', type: 3, required: true, description: 'Roblox Username' },
            { name: 'country', type: 3, required: true, description: 'Country flag emoji' },
            { name: 'stage', type: 3, required: true, description: 'Their Stage/Rank' },
            { name: 'avatar_url', type: 3, required: true, description: 'Link to Roblox headshot' }
        ]
    },
    {
        name: 'leaderboard',
        description: 'Post the Absolute Zero leaderboard'
    },
    {
        name: 'say',
        description: 'Make the bot talk',
        options: [{ name: 'message', type: 3, required: true, description: 'What to say' }]
    }
];

// --- REGISTRATION ---
const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        console.log('Refreshing slash commands...');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('Successfully registered commands.');
    } catch (error) {
        console.error(error);
    }
})();

// --- BOT LOGIC ---
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag} for Absolute Zero`);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    // 1. UPDATE MEMBER
    if (commandName === 'update-member') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Insufficient clearance.', ephemeral: true });
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
        return interaction.reply({ content: `✅ **${options.getString('name')}** has been frozen into the records.`, ephemeral: true });
    }

    // 2. LEADERBOARD (The aesthetic one)
    if (commandName === 'leaderboard') {
        const members = Object.values(clanData);
        
        if (members.length === 0) {
            return interaction.reply({ content: 'The records are empty.', ephemeral: true });
        }

        // Generate the array of embeds
        const embeds = members.map((player, index) => {
            return new EmbedBuilder()
                .setColor(0x2b2d31)
                .setTitle(`${index + 1} - ${player.name}`)
                .setDescription(
                    `|  ${player.discord}  |\n` +
                    `<<<| • ${player.roblox} • |>>>\n\n` +
                    `Country : ${player.country}\n` +
                    `Stage : ${player.stage}`
                )
                .setThumbnail(player.avatar);
        });

        // We use interaction.reply for the first time.
        // To make it "Editable," you would manually copy the message ID later.
        return interaction.reply({ embeds: embeds });
    }

    // 3. SAY COMMAND
    if (commandName === 'say') {
        if (!interaction.member.permissions.has('ManageMessages')) return;
        const msg = options.getString('message');
        await interaction.channel.send(msg);
        return interaction.reply({ content: 'Sent.', ephemeral: true });
    }
});

client.login(token);
                                 
