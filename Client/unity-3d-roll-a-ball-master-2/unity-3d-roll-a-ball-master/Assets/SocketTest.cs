using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using NativeWebSocket;

public class SocketTest : MonoBehaviour
{
    WebSocket websocket;

    // Start is called before the first frame update
    async void Start()
    {
        string serverUrl = "wss://nodegameserver-1.onrender.com";
        websocket = new WebSocket(serverUrl);

        if (websocket == null)
        {
            Debug.LogError("WebSocket initialization failed.");
            return;
        }

        websocket.OnOpen += () =>
        {
            Debug.Log("Connection open!");
            Debug.Log($"Connected to server: {serverUrl}");
        };

        websocket.OnError += (e) =>
        {
            Debug.Log("Error! " + e);
        };

        websocket.OnClose += (e) =>
        {
            Debug.Log("Connection closed!");
        };

        websocket.OnMessage += (bytes) =>
        {
            Debug.Log("OnMessage received!");

            var message = System.Text.Encoding.UTF8.GetString(bytes);
            Debug.Log("OnMessage! " + message);

            if (message.Contains("clientID"))
            {
                Debug.Log("Client ID received: " + message);
            }
        };

        // Waiting for messages
        await websocket.Connect();

        // Ensure the WebSocket is connected before starting to send messages
        if (websocket.State == WebSocketState.Open)
        {
            // Keep sending messages every 0.3 seconds
            InvokeRepeating("SendWebSocketMessage", 0.0f, 0.3f);
        }
        else
        {
            Debug.LogError("WebSocket connection failed to open.");
        }
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        if (websocket != null)
        {
            websocket.DispatchMessageQueue();
        }
#endif
    }

    async void SendWebSocketMessage()
    {
        if (websocket != null && websocket.State == WebSocketState.Open)
        {
            // Sending bytes
            await websocket.Send(new byte[] { 10, 20, 30 });

            // Sending plain text
            await websocket.SendText("plain text message");
        }
        else
        {
            Debug.LogError("WebSocket is not open. Cannot send message.");
        }
    }

    private async void OnApplicationQuit()
    {
        if (websocket != null)
        {
            await websocket.Close();
        }
    }
}