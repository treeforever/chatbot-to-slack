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

const disconnectAnnouncement = '[user disconnected]';

io.on('connection', async (socket: any) => {
    console.log('a user connected');
    let notifyFirstMessage = true;
    let threadTs = '';

    socket.on('retrieve messages by thread ts', async (ts: string) => {
        threadTs = ts;
        const chattyLiveChat = 'CQ85K0E0Z'
        const conversation = await retrieveConversation(chattyLiveChat, threadTs)
        socket.emit('retrieve conversation', conversation)
    })

    socket.on('browser message', async (msg: string) => {
        if (notifyFirstMessage) {
            if (threadTs) {
                postMsgToSlackChannel(msg, threadTs)
            } else {
                threadTs = await initiateChat(msg);
                socket.emit('thread ts', threadTs)
                notifyFirstMessage = false;
            }
        } else {
            postMsgToSlackChannel(msg, threadTs)
        }
    });

    socket.on('offline message', (msg: string) => {
        console.log('offline mmmmm', msg)
    })

    socket.on('disconnect', (reason: string) => {
        if (threadTs && reason === 'transport close') {
            postMsgToSlackChannel(disconnectAnnouncement, threadTs)

        }
        console.log('Chatbot disconnected', reason)
    })


    // connect to Slack RTM to receive events
    console.log(rtm.connected)
    if (!rtm.connected) {
        try {
            await rtm.start()
        } catch (err) {
            console.error('Starting rtm failed', err)
        }
    }

    rtm.on('message', async (event: any) => {
        // console.log('sent from Slack SDK', event);

        // filter to only replies and sent by users that are not Chatty
        if (event.thread_ts === threadTs && event.username !== 'Chatty') {
            const { text, user } = event;
            const name = await getUserName(user);
            socket.emit('slack message', { text, name })
        }
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

const openingMessageStart = 'Someone started a conversation: \n>'
const slackReturnedOpeningMessageStart = 'Someone started a conversation: \n&gt;'
const openingMessageEnd = '\nChat starting in the threads'
const openingMessage = (msg: string) => `${openingMessageStart}${msg}${openingMessageEnd}`


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
            text: openingMessage(msg),
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

const getUserName = async (user: string) => {
    const options: any = {
        url: `https://slack.com/api/users.info?user=${user}`,
        method: 'GET',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${process.env.BOT_USER_TOKEN}`,
        },
    };
    try {
        const response = await axios(options);
        if (response.data.ok) {
            return response.data.user.profile.real_name_normalized
        } else {
            console.log('Getting username not ok', response.data.error)
        }
    } catch (err) {
        console.log('Getting username failed', err);
    }
}

type SlackConversation = Array<{ text: string }>

const retrieveConversation = async (channel: string, ts: string) => {
    const options: any = {
        url: `https://slack.com/api/conversations.replies?channel=${channel}&ts=${ts}`,
        method: 'GET',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
    };
    try {
        const response = await axios(options);
        if (response.data.ok) {
            console.log('getting back conversation')
            return rebuildConversationForUser(response.data.messages)
        } else {
            console.log('getting back conversation not ok', response.data.error)
        }
        return response.data.messages as SlackConversation;
    } catch (err) {
        console.log('Getting back conversation failed', err);
    }
}
type Reply = { text: string, username?: string, user: string }
const rebuildConversationForUser = async (messages: any) => {
    const parentMsg = messages[0].text
    const firstMsg = parentMsg.substring(slackReturnedOpeningMessageStart.length, parentMsg.search(openingMessageEnd))
    const replyUsers: Array<string> = (messages[0].reply_users as Array<string>).filter((user) => !user.startsWith('B')); // eliminate bot user
    const getUserNamesMap = async () => {
        let userNamesMap: { [key: string]: string } = {};
        await Promise.all(replyUsers.map(async (user) => {
            userNamesMap[user] = await getUserName(user)
        }))
        return userNamesMap;
    };
    const userNamesMap: { [key: string]: string } = await getUserNamesMap();

    const replies = messages.slice(1).filter((msg: Reply) => msg.text !== disconnectAnnouncement)
        .map((msg: Reply) => ({
            text: msg.text,
            name: msg.username === 'Chatty' ? 'me' : userNamesMap[msg.user]
        }))

    return [{ text: firstMsg, name: 'me' }, ...replies];
}
