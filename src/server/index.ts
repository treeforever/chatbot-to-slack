var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var axios = require('axios');
require('dotenv').config()
import { generateRandomChannelName } from './utils';

io.on('connection', function (socket: any) {
    console.log('a user connected');
    socket.on('chat message', function (msg: string) {
        console.log('chatm', msg)
        postChatRoomName(msg)
        postInitialMsgToChatRoom(msg, '')
        io.emit('chat message', msg);
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
const postChatRoomName = async (
    text: string,
): Promise<TimeStamp> => {
    const getOptions = (channel: Channel) => ({
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
        data: {
            channel: 'chatty-live-chat',
            text: `Someone asked a question on your website: ${text}. I created a new channel <#${channel.id}|${channel.name}>, join to start a conversation`,
        },
    });
    try {
        const channelName = await createSlackChannel();
        const response = await axios(getOptions(channelName));
        console.log('Post message:', response.data);
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
        const channelName = await createSlackChannel();
        const response = await axios(options);
        console.log('Post message:', response.data);
        return response.data.ts;
    } catch (err) {
        console.log('Message post failed:', err);
    }
};