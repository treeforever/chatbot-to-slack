import * as React from "react";
import { useState, useCallback, useEffect, CSSProperties, useRef } from "react";
const io = require('socket.io-client');
const socket = io('http://3.135.99.121:8080/');
// const socket = io('http://localhost:8080');
import logo from './logo.png';

type Message = {
    text: string,
    name: string
}
const blue = 'rgb(130, 224, 255)';
const darkBlue = 'rgb(54, 153, 186)'
const grey = '#f5f6f7';
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
    background: isMe ? blue : grey,
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
            borderLeftColor: blue,
            borderRight: 0,
            marginRight: '-12px',

        } : {
                left: 0,
                borderRightColor: grey,
                borderLeft: 0,
                marginLeft: '-12px',

            })
    }
}) as CSSProperties
const formStyle = {
    padding: '3px',
    width: '100%',
} as CSSProperties
const formContainerStyle = {
    boxShadow: '#f1f1f1 -1px -6px 10px 0px'
}
const inputStyle = {
    border: 0,
    padding: '10px',
    width: '100%',
    marginRight: '.5%',
    font: '15px Roboto',
    height: '3.5em'
}
const buttonStyle = {
    background: blue,
    border: 'none',
    padding: '10px',
}
const ulStyle = {
    wordBreak: 'break-word',
    listStyleType: 'none',
    margin: 0,
    padding: '0 1em',
    overflowX: 'hidden',
    overflowY: 'auto',
    height: '90%',
} as CSSProperties
const logoStyle = (isOpen: boolean, newMessage: boolean) => ({
    position: 'fixed',
    bottom: 0,
    right: 0,
    zIndex: 9999,
    // background: 'url(./logo.png)',
    // background: newMessage ? 'pink' : (isOpen ? darkBlue : blue),
    // width: '5em',
    // height: '5em',
    // borderRadius: '100%',
    // border: 'none'
}) as CSSProperties
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
} as CSSProperties

// styling for NameAndEmailComponent
const startButtonStyle = {
    font: '13px Roboto',
    display: 'block',
    margin: '2em auto',
    background: '#FAD282',
    padding: '1em 1.5em',
    borderRadius: '10px',
    border: 'none'
}
const nameAndEmailCardStyle = {
    padding: '2em 1.5em',
    borderRadius: '10px',
    marginTop: '3em',
    background: '#f9f9f8'
}
const skipButtonStyle = {
    display: 'block',
    font: '13px Roboto',
    border: 0,
    textDecoration: 'underline',
    margin: '3em auto',
}


const ChatLogo = ({ isOpen, clickHandler, newMessage }: { isOpen: boolean, clickHandler: Function, newMessage: boolean }) =>
    <img src={logo} style={logoStyle(isOpen, newMessage)} onClick={() => clickHandler(!isOpen)} />

const COOKIE_KEY = 'chatty_thread_ts'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 2 // two days
const containChattyThreadTs = (cookie: string) => cookie.includes(COOKIE_KEY)
const extractThreadTs = (cookie: string) => {
    const matchedCookie = cookie.split(';').filter((item) => item.includes(COOKIE_KEY))
    const ts = matchedCookie[0].trim().slice(COOKIE_KEY.length + 1);
    return ts;
}
const writeCookie = (ts: string) => document.cookie = `${COOKIE_KEY}=${ts}; max-age=${COOKIE_MAX_AGE}`

const NameAndEmailForm = ({ close }: { close: () => void }) => {
    const [name, setName] = useState<string>('');
    const [email, setEmail] = useState<string>('');


    const onSubmit = (e: any) => {
        e.preventDefault();
        if (name.trim() === '' || email.trim() === '') return;
        socket.emit('name and email', { name, email })
        close();
    }

    return (
        <div id="name-and-email-container" style={{ padding: '2em' }}>
            <h3>Support</h3>
            <div id="name-and-email-card" style={nameAndEmailCardStyle}>
                <div style={{}}>Leave us your name and email, so that we can get back to you if we are not online right now</div>
                <form id="offline-form" action="" onSubmit={onSubmit} style={{ margin: '3em 1.5em 0' }}>
                    <div style={{ margin: '2em 0 0' }}>
                        <label>name
                    <input style={{ marginLeft: '1em', width: '78%', height: '2.5em' }}
                                type="text" name="name" value={name} onChange={(e: any) => setName(e.target.value)} />
                        </label>
                    </div>
                    <br />
                    <div>
                        <label>email
                    <input style={{ marginLeft: '1em', width: '78%', height: '2.5em' }}
                                type="text" name="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
                        </label>
                    </div>

                    <br />
                    <input type="submit" value="start the conversation" style={startButtonStyle} />

                </form>
            </div>
            <button onClick={close} style={skipButtonStyle}>or skip it</button>
        </div>
    )
}


export default () => {
    const [inputValue, setInputValue] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [readMark, setReadMark] = useState<number>(0);
    const [showNewMessageDot, setNewMessageDot] = useState<boolean>(false);
    const [ts, setTs] = useState<string>(null)
    const [askNameEmail, setAskNameEmail] = useState(true)
    const onChange = useCallback((e: any) => {
        setInputValue(e.target.value)
    }, [])

    const refMessages = useRef(null);

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
        socket.on('slack message', (data: Message) => {
            setMessages((messages) => [...messages, data])
        })
        socket.on('thread ts', (ts: string) => {
            writeCookie(ts);
            setTs(ts);
        })
    }, [])

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

    const clickHandler = () => {
        if (!isOpen) {
            setNewMessageDot(false)
        }
        setIsOpen(!isOpen);
    }

    const onSubmit = (e: any) => {
        e.preventDefault();
        if (inputValue.trim() === '') return;
        setMessages((messages) => [...messages, { name: 'me', text: inputValue }])
        socket.emit('browser message', inputValue)
        setInputValue('');
        writeCookie(ts)
    }

    return (
        <>
            {isOpen &&
                <div id="container" style={containerStyle}>

                    {askNameEmail ?
                        <NameAndEmailForm close={() => setAskNameEmail(false)} />
                        :
                        (
                            <>
                                <ul id="messages" style={ulStyle} ref={refMessages}>
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
                                <div id="form-container" style={formContainerStyle}>
                                    <form action="" onSubmit={onSubmit} style={formStyle}>

                                        <input
                                            onChange={onChange}
                                            value={inputValue}
                                            style={inputStyle}
                                            autoFocus
                                            placeholder="Type here..."
                                            aria-description="type your message here"
                                        />

                                    </form>
                                </div>
                            </>
                        )}
                </div>
            }
            <ChatLogo isOpen={isOpen} clickHandler={clickHandler} newMessage={showNewMessageDot} />
        </>)
}