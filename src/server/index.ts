const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const axios = require('axios');
const { RTMClient, LogLevel } = require('@slack/rtm-api');
require('dotenv').config()
import { generateRandomChannelName } from './utils';

const rtm = new RTMClient(process.env.BOT_USER_TOKEN, {
    logLevel: LogLevel.INFO
});


io.on('connection', async function (socket: any) {
    console.log('a user connected');
    let notifyFirstMessage = true;
    let threadTs = '';

    socket.on('browser message', async function (msg: string) {
        if (notifyFirstMessage) {
            threadTs = await initiateChat(msg);
            notifyFirstMessage = false;
        } else {
            postMsgToSlackChannel(msg, threadTs)
        }

    });

    // connect to Slack RTM to receive events
    console.log(rtm.connected)
    if (!rtm.connected) {
        try {
            await rtm.start()
        } catch (err) {
            console.error('Starting rtm failed', err)
        }
    }

    rtm.on('message', (event: any) => {
        console.log('sent from Slack SDK', event);

        // filter to only replies and sent by users that are not Chatty
        if (event.thread_ts === threadTs && event.username !== 'Chatty') {
            const text = event.text;
            const sender = event.user;

            socket.emit('slack message', { text, sender })
        }
    });
});

http.listen(8080, function () {
    console.log('listening on *:8080');
});

io.on('disconnection', () => {
    console.log('Chatbot disconnected')
})

type TimeStamp = string;
type Channel = {
    id: string,
    name: string
}

const postMsgToSlackChannel = async (msg: string, threadTs: string): Promise<TimeStamp> => {
    const options = ({
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
        data: {
            channel: 'chatty-live-chat',
            text: msg,
            thread_ts: threadTs
        },
    });
    try {
        const response = await axios(options);
        console.log('Posted message to Slack ');
        return response.data.ts;
    } catch (err) {
        console.log('Message post failed:', err);
    }
};

/**
 * Notify everyone in #chatty-live-chat that a channel is created to facilitate a new conversation from the website
 * @param msg 
 * @param channel 
 */
const initiateChat = async (
    msg: string,
) => {
    const options = ({
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
        data: {
            channel: 'chatty-live-chat',
            text: `Someone started a conversation: "${msg}".\nChat starting in the threads`,
        },
    });
    try {
        const response = await axios(options);
        console.log('Notified', response.data);
        return response.data.ts
    } catch (err) {
        console.log('Message post failed:', err);
    }
};

const createSlackChannel = async () => {
    const randomName = generateRandomChannelName()
    const options: any = {
        url: 'https://slack.com/api/channels.join',
        method: 'POST',
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
        data: {
            name: randomName,
        },
    };
    try {
        const response = await axios(options);
        if (response.data.already_in_channel) {
            await createSlackChannel()
        }
        console.log('Create channel:', randomName);
        if (response.data.ok) {
            return {
                name: response.data.channel.name,
                id: response.data.channel.id
            };
        }
    } catch (err) {
        console.log('Channel creation failed:', err);
    }
}

const getSlackWsUrl = async () => {
    const options: any = {
        url: 'https://slack.com/api/rtm.connect',
        method: 'GET',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${process.env.BOT_USER_TOKEN}`,
        }
    };
    try {
        const response = await axios(options);
        const wsUrl = response.data.url;

        console.log('Connecting to Slack RTM');
        return wsUrl;
    } catch (err) {
        console.log('Connecting to Slack RTM failed:', err);
    }
}
