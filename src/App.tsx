import * as React from "react";
import { useState, useCallback, useEffect, CSSProperties } from "react";
const io = require('socket.io-client');
const socket = io('http://localhost:8080');

type Message = {
    text: string,
    name: string
}
const blue = 'rgb(130, 224, 255)';
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
    position: 'fixed',
    bottom: 0,
    width: '100%',
} as CSSProperties
const inputStyle = {
    border: 0,
    padding: '10px',
    width: '90%',
    marginRight: '.5%',
}
const buttonStyle = {
    width: '9%',
    background: blue,
    border: 'none',
    padding: '10px',
}
const ulStyle = {
    wordBreak: 'break-word',
    listStyleType: 'none',
    margin: 0,
    padding: 0,
} as CSSProperties


export default () => {
    const [inputValue, setInputValue] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([])
    const onChange = useCallback((e: any) => {
        setInputValue(e.target.value)
    }, [])

    useEffect(() => {
        socket.on('slack message', (data: Message) => {
            setMessages((messages) => [...messages, data])
        })
    }, [])

    const onSubmit = (e: any) => {
        e.preventDefault();
        if (inputValue === '') return;
        setMessages((messages) => [...messages, { name: 'me', text: inputValue }])
        socket.emit('browser message', inputValue)
        setInputValue('');
    }
    return (
        <>
            <ul id="messages" style={ulStyle}>
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
                <input id="m" onChange={onChange} value={inputValue} style={inputStyle} />
                <button style={buttonStyle}>Send</button>
            </form>
        </>
    )
}