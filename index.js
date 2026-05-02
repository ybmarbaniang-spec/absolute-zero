const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const fs = require('fs');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Load Data
let clanData = {};
if (fs.existsSync('./clanData.json')) {
    try {
        clanData = JSON.parse(fs.readFileSync('./clanData.json', 'utf-8'));
    } catch (e) {
        console.error("Error reading clanData.json, resetting to empty.");
        clanData = {};
    }
}

const saveStats = () => {
    fs.writeFileSync('./clanData.json', JSON.stringify(clanData, null, 2));
};

const commands = [
    {
        name: 'update-member',
        description: 'Update a member on the leaderboard',
        options: [
            { name: 'user', type: 6, required: true, description: 'Discord member' },
            { name: 'name', type: 3, required: true, description: 'Display name' },
            { name: 'roblox', type: 3, required: true, description: 'Roblox Username' },
            { name: 'country', type: 3, required: true, description: 'Country Name' },
            { name: 'stage', type: 3, required: true, description: 'Rank Stage' },
            { name: 'avatar_url', type: 3, required: true, description: 'Avatar Link' }
        ]
    },
    {
        name: 'leaderboard',
        description: 'Display Absolute Zero leaderboard'
    }
];

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    } catch (error) {
        console.error(error);
    }
})();

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    if (commandName === 'update-member') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'Unauthorized.', ephemeral: true });
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
        return interaction.reply({ content: 'Record updated.', ephemeral: true });
    }

    if (commandName === 'leaderboard') {
        try {
            const members = Object.values(clanData);

            if (members.length === 0) {
                return interaction.reply({ content: 'Records are empty.', ephemeral: true });
            }

            const embeds = members.map((player, index) => {
                return new EmbedBuilder()
                    .setColor(0x2b2d31)
                    .setTitle(`${index + 1} - ${player.name}`)
                    .setDescription(
                        `|  ${player.discord}  |\n` +
                        `<<<| | ${player.roblox} | |>>>\n\n` +
                        `Country : ${player.country}\n` +
                        `Stage : ${player.stage}`
                    )
                    .setThumbnail(player.avatar);
            });

            return await interaction.reply({ embeds: embeds });
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: 'Error loading leaderboard.', ephemeral: true });
        }
    }
});

client.login(token);
