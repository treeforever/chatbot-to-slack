const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const WebSocket = require('ws');
const axios = require('axios');
const { RTMClient, LogLevel } = require('@slack/rtm-api');
require('dotenv').config()
import { generateRandomChannelName } from './utils';

io.on('connection', function (socket: any) {
    console.log('a user connected');
    socket.on('chat message', function (msg: string) {
        initiateChat(msg)
    });
});

http.listen(8080, function () {
    console.log('listening on *:8080');
});

type TimeStamp = string;
type Channel = {
    id: string,
    name: string
}

const initiateChat = async (msg: string) => {
    const channel = await createSlackChannel();

    // relay first chat message to Slack
    notify(msg, channel)
    postInitialMsgToChatRoom(msg, channel.name)

    // establish connection to Slack ws
    const slackWSUrl = await getSlackWsUrl()
    connectSlackWs(slackWSUrl)
}

/**
 * Notify everyone in #chatty-live-chat that a channel is created to facilitate a new conversation from the website
 * @param msg 
 * @param channel 
 */
const notify = async (
    msg: string,
    channel: Channel
): Promise<TimeStamp> => {
    const options = ({
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
        data: {
            channel: 'chatty-live-chat',
            text: `Someone started a conversation: "${msg}".\nChat starting in <#${channel.id}|${channel.name}>`,
        },
    });
    try {
        const response = await axios(options);
        console.log('Notified');
        return response.data.ts;
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
            createSlackChannel()
        }
        console.log('Create channel:', randomName);
        return {
            name: response.data.channel.name,
            id: response.data.channel.id
        };
    } catch (err) {
        console.log('Channel creation failed:', err);
    }
}

const postInitialMsgToChatRoom = async (msg: string, channel: string): Promise<TimeStamp> => {
    const options = ({
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
        data: {
            channel,
            text: msg,
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

const startSlackRTM = async () => {
    const options: any = {
        url: 'https://slack.com/api/rtm.start',
        method: 'GET',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${process.env.BOT_USER_TOKEN}`,
        }
    };
    try {
        const response = await axios(options);
        const wsUrl = response.data.url;

        console.log('Starting Slack RTM', wsUrl);
        return wsUrl;
    } catch (err) {
        console.log('Starting Slack RTM failed:', err);
    }
}

// const rtm = new RTMClient(process.env.BOT_USER_TOKEN, {
//     logLevel: LogLevel.INFO
// });

// rtm.on('message', (event: string) => {
//     console.log('sent from Slack SDK', event);
// });
const connectSlackWs = async (url: string) => {
    const ws = new WebSocket(url);

    ws.on('open', function open() {
        console.log('Slack ws opened')
        // ws.send('something');
    });

    ws.on('close', function close() {
        console.log('disconnected');
    });

    ws.on('message', function incoming(data: string) {
        console.log('Slack sent:', data);
    });

    ws.on('error', function incoming(data: string) {
        console.log('Slack sent error:', data);
    });

    // const { self, team } = await rtm.start();

    // console.log('se', self, team)
}