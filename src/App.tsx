import * as React from "react";
import { useState, useCallback, useEffect, CSSProperties, useRef } from "react";
import * as io from 'socket.io-client';
// const socket = io('//3.135.99.121');
const socket = io('https://parrot.ai.science');
// const socket = io('http://localhost:8080');

type Message = {
    text: string,
    name: string
}
const brandBlue = '#add4ff';
const brandGrey = '#f3f3f3';
const onlineGreen = '#27f327'
const offlineRed = '#fb3f61'
const listStyle = (isMe: boolean) => ({
    padding: '5px 10px',
    marginTop: '.5em',
    display: 'flex',
    justifyContent: isMe ? 'flex-end' : 'flex-start',
})
const messageStyle = (isMe: boolean) => ({
    position: 'relative',
    borderRadius: '.4em',
    padding: '1em',
    background: isMe ? brandBlue : brandGrey,
    maxWidth: '80%',
    '&:after': {
        content: '',
        position: 'absolute',
        top: '50%',
        width: 0,
        height: 0,
        border: '12px solid transparent',
        marginTop: '-12px',
        ...(isMe ? {
            right: 0,
            borderLeftColor: brandBlue,
            borderRight: 0,
            marginRight: '-12px',

        } : {
                left: 0,
                borderRightColor: brandGrey,
                borderLeft: 0,
                marginLeft: '-12px',

            })
    }
}) as CSSProperties
const formStyle = {
    width: '100%',
} as CSSProperties
const formContainerStyle = {
    marginTop: '3em',
    boxShadow: '#f1f1f1 -1px -6px 10px 0px'
}
const inputStyle = {
    border: 0,
    padding: '10px',
    width: '100%',
    marginRight: '.5%',
    font: '15px Roboto',
    height: '3.5em',
    boxSizing: 'border-box',
    borderRadius: '0 0 15px 15px'
} as CSSProperties
const ulStyle = (isOffline: boolean) => ({
    wordBreak: 'break-word',
    listStyleType: 'none',
    marginTop: '1em',
    padding: '0 1em',
    overflowX: 'hidden',
    overflowY: 'auto',
    height: isOffline ? '57%' : '72%',
}) as CSSProperties
const logoStyle = {
    position: 'fixed',
    bottom: 0,
    right: 0,
    zIndex: 9999,
} as CSSProperties
const containerStyle = {
    font: '15px Roboto',
    color: '#292929',
    border: 'solid 1px rgb(236, 235, 235)',
    width: '25em',
    height: '40em',
    position: 'fixed',
    bottom: '5em',
    right: '.5em',
    borderRadius: '15px',
    boxShadow: '-2px 10px 12px 0px rgba(201, 197, 201, 0.89)',
    background: 'white',
    zIndex: 9999
} as CSSProperties

// styling for NameAndEmailComponent
const startButtonStyle = (disabled: boolean) => ({
    font: '13px Roboto',
    display: 'block',
    margin: '2em auto',
    background: disabled ? 'rgb(216, 216, 216)' : '#FAD282',
    padding: '1em 1.5em',
    borderRadius: '10px',
    border: 'none',
})
const nameAndEmailCardStyle = {
    padding: '2em 1.5em',
    borderRadius: '10px',
    margin: '3em 2em 0 2em',
    background: brandGrey
}
const nameEmailInputStyle = { marginLeft: '1em', height: '30px', border: 'none', borderRadius: '3px' }
const skipButtonStyle = {
    display: 'block',
    font: '13px Roboto',
    border: 0,
    textDecoration: 'underline',
    margin: '3em auto',
}
const onlineDotStyle = (isOnline: boolean) => ({
    display: 'inline-block',
    width: '.5em',
    height: '.5em',
    borderRadius: '50%',
    background: isOnline ? onlineGreen : offlineRed,
    margin: '0 0.2em 0 1em'
})
const headerStyle = {
    fontSize: '1.3em',
    padding: '.8em 1em',
    background: brandGrey,
    borderRadius: '15px 15px 0 0',
    fontWeight: 450
}
const offlineReminderStyle = {
    padding: '2em 3em 0',
    fontSize: '12px',
    lineHeight: '1.5em',
    color: 'grey'
}

const newMessageLogo = "https://eager-kowalevski-ce1d45.netlify.com/new_message_logo.png";
const logo = "https://eager-kowalevski-ce1d45.netlify.com/logo.png";
const closeLogo = 'https://eager-kowalevski-ce1d45.netlify.com/logo_close.png'
const ChatLogo = ({ isOpen, clickHandler, newMessage }: {
    isOpen: boolean, clickHandler: Function, newMessage: boolean
}) =>
    <img src={newMessage ? newMessageLogo : (isOpen ? closeLogo : logo)}
        style={logoStyle} onClick={() => clickHandler(!isOpen)} />

const COOKIE_KEY = 'chatty_thread_ts'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 2 // two days
const containChattyThreadTs = (cookie: string) => cookie.includes(COOKIE_KEY)
const extractThreadTs = (cookie: string) => {
    const matchedCookie = cookie.split(';').filter((item) => item.includes(COOKIE_KEY))
    const ts = matchedCookie[0].trim().slice(COOKIE_KEY.length + 1);
    return ts;
}
const writeCookie = (ts: string) => document.cookie = `${COOKIE_KEY}=${ts}; max-age=${COOKIE_MAX_AGE}`
const isOfficeHours = ([start, end]: number[]) => {
    const now = new Date();
    const UTCHours = now.getUTCHours()
    if (start < end) {
        return UTCHours >= start && UTCHours <= end
    } else if (start === end) {
        return true;
    } else {
        return UTCHours >= start || UTCHours <= end
    }
}
const AISC_OFFICE_HOURS = [14, 2]
const Header = () => {
    const isOnline = isOfficeHours(AISC_OFFICE_HOURS)
    const isOnlineStyle = onlineDotStyle(isOnline)
    const isOnlineText = isOnline ? 'online' : 'offline'
    return (
        <div style={headerStyle}>
            Support
            <div id={`${isOnlineText}-dot`} style={isOnlineStyle}></div>
            <span style={{ fontSize: '.8em', fontWeight: 300 }}>{isOnlineText}</span>
        </div>)
}
const NameAndEmailForm = ({ close }: { close: () => void }) => {
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');


    const onSubmit = (e: React.ChangeEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (name.trim() === '' || email.trim() === '') return;
        socket.emit('name and email', { name, email })
        close();
    }
    const startButtonDisabled = !(name && email)

    return (
        <div id="name-and-email-container">
            <div id="name-and-email-card" style={nameAndEmailCardStyle}>
                <div style={{}}>Leave us your name and email, so that we can get back to you if we are not online right now (optional)</div>
                <form id="offline-form" action="" onSubmit={onSubmit} style={{ margin: '3em 1.5em 0' }}>
                    <div style={{ margin: '2em 0 0' }}>
                        <label>name
                    <input style={nameEmailInputStyle}
                                type="text" name="name" value={name} onChange={(e: any) => setName(e.target.value)} />
                        </label>
                    </div>
                    <br />
                    <div>
                        <label>email
                    <input style={nameEmailInputStyle}
                                type="text" name="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                        </label>
                    </div>

                    <br />
                    <input type="submit" value="start the conversation" style={startButtonStyle(startButtonDisabled)} {...{ disabled: !(name && email) }} />

                </form>
            </div>
            <button onClick={close} style={skipButtonStyle}>or skip it</button>
        </div>
    )
}

const OfflineReminder = () =>
    <div id="offline-reminder" style={offlineReminderStyle}>Office hours are 9am to 9pm Eastern Time (GMT-05:00). But you can still leave a message, our staff will get back to you as soon as they can.</div>

export default () => {
    const [inputValue, setInputValue] = useState('');
    const [messages, setMessages] = useState<Message[]>([])
    const [isOpen, setIsOpen] = useState(false);
    const [readMark, setReadMark] = useState(0);
    const [showNewMessageDot, setNewMessageDot] = useState(false);
    const [ts, setTs] = useState<string | null>(null)
    const [askNameEmail, setAskNameEmail] = useState(true)
    const onMessageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
    }, [])

    const refMessages = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (containChattyThreadTs(document.cookie)) {
            const threadTs = extractThreadTs(document.cookie)
            setTs(threadTs);
            socket.emit('retrieve messages by thread ts', threadTs)
            socket.on('retrieve conversation', (conversation: Message[]) => {
                setMessages(conversation);
                setReadMark(conversation.length)
                setNewMessageDot(false)
            })

            setAskNameEmail(false)
        }

        const onMessage = (data: Message) => {
            setMessages((messages) => [...messages, data])
        };
        const onThreadTs = (ts: string) => {
            writeCookie(ts);
            setTs(ts);
        };
        socket.on('slack message', onMessage);
        socket.on('thread ts', onThreadTs);

        return () => {
            socket.off('slack message', onMessage);
            socket.off('thread ts', onThreadTs);
        }
    }, []);

    useEffect(() => {
        const scrollToLatestMessage = () => {
            const scrollableNode = refMessages.current
            if (scrollableNode) {

                const { scrollHeight } = scrollableNode;
                scrollableNode.scrollTop = scrollHeight;
            }
        }

        scrollToLatestMessage()

        if (isOpen) {
            setReadMark(messages.length)
        }
    }, [messages, isOpen])

    useEffect(() => {
        if (!isOpen && readMark !== messages.length) {
            setNewMessageDot(true)
        }
    }, [messages, readMark, isOpen])

    const onLogoClick = (isOpen: boolean) => {
        if (!isOpen) {
            setNewMessageDot(false);
        }
        setIsOpen(!isOpen);
    }

    const onContactFormSubmit = (e: React.ChangeEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (inputValue.trim() === '') return;
        setMessages((messages) => [...messages, { name: 'me', text: inputValue }])
        socket.emit('browser message', inputValue);
        setInputValue('');
        writeCookie(ts)
    }

    const isOffline = !isOfficeHours(AISC_OFFICE_HOURS)

    return (
        <>
            {isOpen &&
                <div id="container" role="dialog"
                    aria-label="chatty customer support"
                    style={containerStyle}
                >
                    <Header />
                    {askNameEmail ?
                        <NameAndEmailForm close={() => setAskNameEmail(false)} />
                        : (
                            <>
                                <ul id="messages" style={ulStyle(isOffline)} ref={refMessages}>
                                    {messages.map((m, index) =>
                                        <li
                                            key={index + m.text.slice(0, 3)}
                                            style={listStyle(m.name === 'me')}
                                        >
                                            <span
                                                className={m.name === 'me' ? 'my-message' : 'other-message'}
                                                style={messageStyle(m.name === 'me')}
                                            >
                                                {m.name !== 'me' ? `${m.name}: ` : ''}{m.text}
                                            </span>
                                        </li>
                                    )}
                                </ul>

                                {isOffline && <OfflineReminder />}

                                <div id="form-container" style={formContainerStyle}>
                                    <form action="" onSubmit={onContactFormSubmit} style={formStyle}>

                                        <input
                                            onChange={onMessageInputChange}
                                            value={inputValue}
                                            style={inputStyle}
                                            autoFocus
                                            placeholder="Type your message here..."
                                            aria-label="type your message here"
                                        />

                                    </form>
                                </div>
                            </>
                        )}
                </div>
            }
            <ChatLogo
                isOpen={isOpen}
                clickHandler={() => onLogoClick(isOpen)}
                newMessage={showNewMessageDot}
            />
        </>)
}