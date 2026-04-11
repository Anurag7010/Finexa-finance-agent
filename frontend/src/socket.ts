// socket.ts — stub file maintained by B1
// B2 imports from here; do not modify from B2 scope

import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000'

export const socket = io(WS_URL, {
  autoConnect: false,
  withCredentials: true,
})

export const connectSocket = () => socket.connect()
export const disconnectSocket = () => socket.disconnect()
