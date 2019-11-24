import * as React from "react";
import { useState, useCallback, useEffect, CSSProperties, useRef } from "react";
const io = require('socket.io-client');
const socket = io('http://localhost:8080');

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
    background: '#000',
    padding: '3px',
    width: '100%',
} as CSSProperties
const inputStyle = {
    border: 0,
    padding: '10px',
    width: '80%',
    marginRight: '.5%',
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
    padding: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    height: '90%',
} as CSSProperties
const logoStyle = (isOpen: boolean, newMessage: boolean) => ({
    position: 'fixed',
    bottom: 0,
    right: 0,
    zIndex: 9999,
    background: newMessage ? 'pink' : (isOpen ? darkBlue : blue),
    width: '5em',
    height: '5em',
    borderRadius: '100%',
    border: 'none'
}) as CSSProperties
const containerStyle = {
    border: 'solid 1px #d4d4d4',
    width: '20em',
    height: '30em',
    position: 'fixed',
    bottom: '5em',
    right: '.5em',
    borderRadius: '15px',
} as CSSProperties


const ChatLogo = ({ isOpen, clickHandler, newMessage }: { isOpen: boolean, clickHandler: Function, newMessage: boolean }) =>
    <button style={logoStyle(isOpen, newMessage)} onClick={() => clickHandler(!isOpen)} />

const COOKIE_KEY = 'chatty_thread_ts'
const containChattyThreadTs = (cookie: string) => cookie.includes(COOKIE_KEY)
const extractThreadTs = (cookie: string) => {
    const matchedCookie = cookie.split(';').filter((item) => item.includes(COOKIE_KEY))
    const ts = matchedCookie[0].trim().slice(COOKIE_KEY.length + 1);
    return ts;
}
export default () => {
    const [inputValue, setInputValue] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [readMark, setReadMark] = useState<number>(0);
    const [showNewMessageDot, setNewMessageDot] = useState<boolean>(false);
    const onChange = useCallback((e: any) => {
        setInputValue(e.target.value)
    }, [])

    const refMessages = useRef(null);

    useEffect(() => {
        if (containChattyThreadTs(document.cookie)) {
            socket.emit('retrieve messages by thread ts', extractThreadTs(document.cookie))
        }
        socket.on('slack message', (data: Message) => {
            setMessages((messages) => [...messages, data])
        })
        socket.on('thread ts', (ts: string) => {
            document.cookie = `${COOKIE_KEY}=${ts}`
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


    const resetNewMessageDotUponOpen = () => {
        if (!isOpen) {
            setNewMessageDot(false)
        }
    }

    const clickHandler = () => {
        resetNewMessageDotUponOpen();
        setIsOpen(!isOpen);
    }

    const onSubmit = (e: any) => {
        e.preventDefault();
        if (inputValue === '') return;
        setMessages((messages) => [...messages, { name: 'me', text: inputValue }])
        socket.emit('browser message', inputValue)
        setInputValue('');
    }
    return (
        <>
            {isOpen &&
                (<div id="container" style={containerStyle}>
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
                    <form action="" onSubmit={onSubmit} style={formStyle}>
                        <input id="m" onChange={onChange} value={inputValue} style={inputStyle} autoFocus />
                        <button style={buttonStyle}>Send</button>
                    </form>
                </div>)}
            <ChatLogo isOpen={isOpen} clickHandler={clickHandler} newMessage={showNewMessageDot} />
        </>
    )
}