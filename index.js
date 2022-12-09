const { Client, Events, GatewayIntentBits, User, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CronJob = require('cron').CronJob;

const fileSystem = require('fs');

var channel;

let skipSat = false;
let skipSun = false;

const katerButtonSat = "katerButtonSat";
const katerButtonSun = "katerButtonSun";
const katerButtonBoth = "katerButtonBoth";

const members = [
    { name: "Elwin", discordUserId: "141333341659070465" },
    { name: "Arren", discordUserId: "144869597344956416" },
    { name: "Dieter", discordUserId: "1049621416007454720" },
    { name: "Tim", discordUserId: "496371517568057355" }
]

client.once(Events.ClientReady, (c) => {
    console.log(`Discord client loaded, logged in as ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {

    channel = client.channels.cache.get("1049616661503807560");

    // see https://crontab.guru/
    const everyDayAt10am = "0 10 * * *";
    const everyTuesdayAt10am = "0 10 * * TUE";
    const everyFirstDayOfMonth = "0 10 1 * *";
    const everyWednesdayAt10am = "0 10 * * MON";
    const everyFridayAt10Am = "30 10 * * FRI";

    var keukenJobs = new CronJob(everyDayAt10am, distributeKeukenTaken, null, false, 'Europe/Brussels');
    keukenJobs.start();

    var HanddoekenJob = new CronJob(everyTuesdayAt10am, distributeHanddoekenTaak, null, false, 'Europe/Brussels');
    HanddoekenJob.start();

    var glasJob = new CronJob(everyFirstDayOfMonth, distributeGlas, null, false, 'Europe/Brussels');
    glasJob.start();

    var gftJob = new CronJob(everyWednesdayAt10am, distributeGft, null, false, 'Europe/Brussels');
    gftJob.start();

    var katerDagJob = new CronJob(everyFridayAt10Am, askKaterDag, null, false, 'Europe/Brussels');
    katerDagJob.start();
})

async function askKaterDag() {
    let row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(katerButtonSat)
                .setLabel('Zaterdag')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(katerButtonSun)
                .setLabel('Zondag')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(katerButtonBoth)
                .setLabel('Beide')
                .setStyle(ButtonStyle.Primary),
        );

    await channel.send({ content: `What day are we too naar de kloten om te koken deze week?`, components: [row] });

    // mega convoluted manier om te zorgen da ik kan reageren op klik actie en knoppen updaten
    const filter = i => i.customId === katerButtonSat || i.customId === katerButtonSun;
    const collector = channel.createMessageComponentCollector({ filter, time: 28800000 });
    console.log("collector created");
    collector.on('collect', async i => {
        console.log("collector started");
        let newActionRows = i.message.components.map(oldActionRow => {

            updatedActionRow = new ActionRowBuilder();
            updatedActionRow.addComponents(oldActionRow.components.map(buttonComponent => {
                newButton = ButtonBuilder.from(buttonComponent)
                newButton.setDisabled(true);
                return newButton;
            }));
            return updatedActionRow;
        });

        if (i.customId === katerButtonSat) {
            skipSat = true;
        }

        if (i.customId === katerButtonSun) {
            skipSun = true;
        }

        if (i.customId === katerButtonBoth) {
            skipSat = true;
            skipSun = true;
        }

        await i.update({ content: `Mercikes om te klikken ${i.user}`, components: newActionRows });
    });
}

async function distributeKeukenTaken() {

    var date = new Date();

    if (date.getDay() == 5 && skipSat == true) {
        skipSat = false;
        return;
    }

    if (date.getDay() == 6 && skipSun == true) {
        skipSun = false;
        return;
    }

    console.log("datechecks passed");

    var indexAfwasser = parseInt(fileSystem.readFileSync('./indexes/afwasser.txt'));
    var indexSousChef = parseInt(fileSystem.readFileSync('./indexes/souschef.txt'));

    console.log(`indexes parsed: afwasser = ${indexAfwasser} and sousChef = ${indexSousChef}`);

    if (members[indexAfwasser].name == "Arren") {
        indexAfwasser++;
    }

    if (members[indexSousChef].name == "Arren") {
        indexSousChef++;
    }

    var afwasser = await getUser(indexAfwasser);
    var sousChef = await getUser(indexSousChef);

    console.log("users fetched");

    await channel.send({ content: `${afwasser} moet vandaag afwassen, en ${sousChef} moet Arren helpen met koken.` });

    indexAfwasser++;
    indexSousChef++;

    console.log("message sent and indexes increased");

    if (indexAfwasser >= members.length) {
        indexAfwasser = 0;
    }

    if (indexSousChef >= members.length) {
        indexSousChef = 0;
    }

    fileSystem.writeFileSync('./indexes/afwasser.txt', indexAfwasser.toString());
    fileSystem.writeFileSync('./indexes/souschef.txt', indexSousChef.toString());

    console.log("indexes written away");
}

async function distributeHanddoekenTaak() {
    var indexHanddoeken = parseInt(fileSystem.readFileSync('./indexes/handdoeken.txt'));
    var wasMadam = await getUser(indexHanddoeken);

    await channel.send({ content: `${wasMadam} moet deze week de handdoeken wassen en ophangen.` });

    indexHanddoeken++;

    if (indexHanddoeken >= members.length) {
        indexHanddoeken = 0;
    }

    fileSystem.writeFileSync('./indexes/handdoeken.txt', indexHanddoeken.toString());
}

async function distributeGlas() {
    var indexGlas = parseInt(fileSystem.readFileSync('./indexes/glas.txt'));
    var glasUser = await getUser(indexGlas);

    await channel.send({ content: `${glasUser} moet deze maand het glas wegdoen.` });

    indexGlas++;

    if (indexGlas >= members.length) {
        indexGlas = 0;
    }

    fileSystem.writeFileSync('./indexes/glas.txt', indexGlas.toString());
}

async function distributeGft() {
    var indexGft = parseInt(fileSystem.readFileSync('./indexes/gft.txt'));
    var gftUser = await getUser(indexGft);

    await channel.send({ content: `${gftUser} moet deze week het gft afval wegdoen.` });

    indexGft++;

    if (indexGft >= members.length) {
        indexGft = 0;
    }

    fileSystem.writeFileSync('./indexes/gft.txt', indexGft.toString());
}

async function getUser(index) {
    return await client.users.fetch(members[index].discordUserId);
}