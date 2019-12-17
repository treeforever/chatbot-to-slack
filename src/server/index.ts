import Express = require('express');
import Http = require('http');
import SocketIO = require('socket.io');
import axios from 'axios';
import { RTMClient, LogLevel } from '@slack/rtm-api';
require('dotenv').config()

const app = Express();
const http = Http.createServer(app);
const io = SocketIO(http, { origins: '*:*' });

const chattyLiveChat = 'CQSLJNMDY';

const rtm = new RTMClient(process.env.BOT_USER_TOKEN, {
    logLevel: LogLevel.INFO
});

const disconnectAnnouncement = '[user disconnected]';
let lastMsgIsDisconnect = false;
io.on('connection', async (socket) => {
    console.info('a user connected');
    let threadTs = '';
    let userName: string;
    let userEmail: string;

    socket.on('retrieve messages by thread ts', async (ts: string) => {
        threadTs = ts;
        const conversation = await retrieveConversation(chattyLiveChat, threadTs)
        if (conversation) socket.emit('retrieve conversation', conversation)
    })

    socket.on('browser message', async (msg: string) => {
        if (threadTs) {
            postMsgToSlackChannel(msg, threadTs)
            lastMsgIsDisconnect = false;
        } else {
            threadTs = await initiateChat(msg, userName, userEmail);
            socket.emit('thread ts', threadTs)
            lastMsgIsDisconnect = false;
        }
    });

    socket.on('name and email', ({ name, email }: { name: string, email: string }) => {
        userName = name;
        userEmail = email;
    })

    socket.on('disconnect', (reason: string) => {
        if (threadTs && reason === 'transport close' && !lastMsgIsDisconnect) {
            postMsgToSlackChannel(disconnectAnnouncement, threadTs)
            lastMsgIsDisconnect = true;
        }
        console.info('Chatbot disconnected', reason)
    })

    // connect to Slack RTM to receive events
    console.debug("rtm.connected", rtm.connected);
    if (!rtm.connected) {
        try {
            await rtm.start();
        } catch (err) {
            console.error('Starting rtm failed', err)
        }
    }

    rtm.on('message', async (event) => {
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
    console.info('listening on *:8080');
});

type TimeStamp = string;

const postMsgToSlackChannel = async (msg: string, threadTs: string): Promise<TimeStamp> => {
    const options = ({
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST' as const,
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
        const { data }: { data: slack.SlackResponse } = await axios(options);
        console.info('Posted message to Slack ');
        return data.ts;
    } catch (err) {
        console.error('Message post failed:', err);
    }
};

const anonymousStart = 'An anonymous user started a conversation: \n>'
const openingMessageEnd = '\nChat starting in the threads :point_right:'
const openingMessage = (msg: string, start: string) => `${start}${msg}${openingMessageEnd}`

const initiateChat = async (
    msg: string,
    name: string,
    email: string
) => {
    const formattedEmail = '`' + email + '`';
    const identifiedStart = `*${name}* ${formattedEmail} started a conversation: \n>`
    const options = ({
        url: 'https://slack.com/api/chat.postMessage',
        method: 'POST' as const,
        headers: {
            'Content-type': 'application/json;charset=utf-8',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
        data: {
            channel: 'chatty-live-chat',
            text: openingMessage(msg,
                (name && email ? identifiedStart : anonymousStart)
            ),
        },
    });
    try {
        const { data }: { data: slack.SlackResponse } = await axios(options);
        console.info('Notified', data);
        return data.ts;
    } catch (err) {
        console.error('Message post failed:', err);
    }
};

const getUserName = async (user: string) => {
    const options = {
        url: `https://slack.com/api/users.info?user=${user}`,
        method: 'GET' as const,
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${process.env.BOT_USER_TOKEN}`,
        },
    };
    try {
        const { data }: { data: slack.UserInfo } = await axios(options);
        if (data.ok === true) {
            return data.user.profile.real_name_normalized
        } else {
            console.info('Getting username not ok', data.error)
        }
    } catch (err) {
        console.error('Getting username failed', err);
    }
}


const retrieveConversation = async (channel: string, ts: string) => {
    const options = {
        url: `https://slack.com/api/conversations.replies?channel=${channel}&ts=${ts}`,
        method: 'GET' as const,
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${process.env.SLACK_OAUTH_TOKEN}`,
        },
    };
    try {
        const { data }: { data: slack.ConversationReplies } = await axios(options);
        if (data.ok === true) {
            console.info('getting back conversation')
            return rebuildConversationForUser(data.messages)
        } else {
            console.info('getting back conversation not ok', data.error);
            return null;
        }
    } catch (err) {
        console.error('Getting back conversation failed', err);
    }
}

type Reply = { text: string, username?: string, user: string }
const rebuildConversationForUser = async (messages: slack.Messages) => {
    const a = messages[0];
    const parentMsg = messages[0].text;
    const firstMsg = extractFirstMessage(parentMsg)
    const replyUsers: Array<string> = (
        messages[0].reply_users as Array<string>)
        .filter((user) => !user.startsWith('B')); // eliminate bot user
    const getUserNamesMap = async () => {
        let userNamesMap: { [key: string]: string } = {};
        await Promise.all(replyUsers.map(async (user) => {
            userNamesMap[user] = await getUserName(user)
        }))
        return userNamesMap;
    };
    const userNamesMap: { [key: string]: string } = await getUserNamesMap();

    const replies = messages.slice(1).filter((msg: Reply) => msg.text !== disconnectAnnouncement)
        .map((msg: Reply) => {
            return {
                text: msg.text,
                name: msg.username === 'Chatty' ? 'me' : userNamesMap[msg.user],
            }
        })

    return [{ text: firstMsg, name: 'me' }, ...replies];
}
const extractFirstMessage = (text: string) => {
    const tag = '\n&gt;'
    const index = text.search(tag) + tag.length;
    return text.slice(index, text.search(openingMessageEnd))
}
