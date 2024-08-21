using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using NativeWebSocket;
using Newtonsoft.Json;

public class NetworkManager : MonoBehaviour
{
    [Header("UI References")]
    public Text countText;
    public Text winText;
    public Text clientIdText;
    public Text sessionIdText;

    [Header("Player Prefabs")]
    public GameObject localPlayerPrefab;
    public GameObject remotePlayerPrefab;

    [Header("WebSocket Settings LiveServer")]
    public string serverUrlLive = "wss://nodegameserver-1.onrender.com/";

    [Header("WebSocket Settings Local")]
    public string serverUrl = "ws://localhost:3000/";
    private WebSocket websocket;
    private string clientId;
    private string clientColor;
    private string sessionId;
    private GameObject playerInstance;

    private Dictionary<string, GameObject> playerInstances = new Dictionary<string, GameObject>();

    async void Start()
    {
        Debug.Log("Initializing WebSocket connection...");

        websocket = new WebSocket(serverUrl);

        websocket.OnOpen += () =>
        {
            Debug.Log("WebSocket connection open!");
        };
        websocket.OnError += (e) =>
        {
            Debug.LogError("WebSocket error: " + e);
        };
        websocket.OnClose += (e) =>
        {
            Debug.Log("WebSocket connection closed!");
        };

        websocket.OnMessage += (bytes) =>
        {
            string message = System.Text.Encoding.UTF8.GetString(bytes);
            HandleMessage(message);
        };

        try
        {
            await websocket.Connect();
            if (websocket.State == WebSocketState.Open)
            {
                Debug.Log("WebSocket connection is open.");
            }
            else
            {
                Debug.LogError("WebSocket connection failed to open.");
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError("Exception during WebSocket connection: " + e.Message);
        }
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        websocket?.DispatchMessageQueue();
#endif
    }

    async void SendWebSocketMessage()
    {
        if (websocket != null && websocket.State == WebSocketState.Open)
        {
            try
            {
                await websocket.SendText(JsonConvert.SerializeObject(new
                {
                    type = "ping",
                    clientId = clientId,
                    sessionId = sessionId
                }));
            }
            catch (System.Exception e)
            {
                Debug.LogError($"Error sending WebSocket message: {e.Message}");
            }
        }
    }

    private async void OnApplicationQuit()
    {
        if (websocket != null)
        {
            await websocket.Close();
        }
    }

    private void HandleMessage(string message)
    {
        try
        {
            var messageData = JsonConvert.DeserializeObject<MessageData>(message);

            if (messageData != null)
            {
                if (messageData.type == "session")
                {
                    clientId = messageData.clientId;
                    sessionId = messageData.sessionId;
                    clientColor = messageData.color;

                    if (clientIdText != null)
                    {
                        clientIdText.text = "Client ID: " + clientId;
                    }
                    if (sessionIdText != null)
                    {
                        sessionIdText.text = $"Session ID: {sessionId}";
                    }

                    SpawnPlayer(clientId, messageData.isFirstPlayer, clientColor);
                }
                else if (messageData.type == "playerUpdate")
                {
                    if (!playerInstances.ContainsKey(messageData.clientId))
                    {
                        SpawnPlayer(messageData.clientId, messageData.isFirstPlayer, messageData.color);
                    }

                    HandlePlayerUpdate(messageData);
                }
            }
        }
        catch (System.Exception e)
        {
            Debug.LogError($"Error processing message: {e.Message}");
        }
    }

    private void HandlePlayerUpdate(MessageData messageData)
    {
        if (playerInstances.TryGetValue(messageData.clientId, out GameObject player))
        {
            if (messageData.clientId != GetClientId())
            {
                UpdatePlayerPosition(player, messageData.position.ToVector3(), messageData.rotation.ToQuaternion());
            }
        }
    }

    void SpawnPlayer(string clientId, bool isFirstPlayer, string colorHex)
{
    if (localPlayerPrefab != null && remotePlayerPrefab != null)
    {
        if (!playerInstances.ContainsKey(clientId))
        {
            GameObject newPlayer;
            if (clientId == this.clientId)
            {
                // Spawn local player
                newPlayer = Instantiate(localPlayerPrefab);
                playerInstance = newPlayer;
            }
            else
            {
                // Spawn remote player
                newPlayer = Instantiate(remotePlayerPrefab);
            }

            // Assign color based on whether the player is the first or second player
            Color playerColor;
            if(string.Equals(colorHex, "red")) playerColor = Color.red;
            else if (string.Equals(colorHex, "blue")) playerColor = Color.blue;
            else playerColor = Color.yellow;

            // Apply color to the player's material
            Renderer playerRenderer = newPlayer.GetComponent<Renderer>();
            if (playerRenderer != null)
            {
                playerRenderer.material.color = playerColor;
            }
            else
            {
                Debug.LogError("Renderer component missing from player prefab.");
            }

            playerInstances[clientId] = newPlayer;
        }
    }
    else
    {
        Debug.LogError("Prefabs for local and remote players are not assigned.");
    }
}


    private void UpdatePlayerPosition(GameObject player, Vector3 position, Quaternion rotation)
    {
        if (player != null)
        {
            Transform playerTransform = player.transform;
            playerTransform.position = position;
            playerTransform.rotation = rotation;
        }
        else
        {
            Debug.LogError("Player GameObject is null.");
        }
    }

    public async void SendPlayerUpdate(Vector3 position, Quaternion rotation)
    {
        if (websocket != null && websocket.State == WebSocketState.Open)
        {
            try
            {
                await websocket.SendText(JsonConvert.SerializeObject(new
                {
                    type = "playerUpdate",
                    clientId = clientId,
                    sessionId = sessionId,
                    position = new Position { x = position.x, y = position.y, z = position.z },
                    rotation = new Rotation { x = rotation.x, y = rotation.y, z = rotation.z, w = rotation.w }
                }));
            }
            catch (System.Exception e)
            {
                Debug.LogError($"Error sending player update: {e.Message}");
            }
        }
    }

    public string GetClientId()
    {
        return clientId;
    }

    public string GetSessionId()
    {
        return sessionId;
    }

    public GameObject GetPlayer()
    {
        return playerInstance;
    }

    public Text GetCountTextRef()
    {
        return countText;
    }

    public Text GetWinTextRef()
    {
        return winText;
    }
}

[System.Serializable]
public class MessageData
{
    public string type;
    public string clientId;
    public string sessionId;
    public Vector3Data position;
    public QuaternionData rotation;
    public bool isFirstPlayer;
    public string color;
}

[System.Serializable]
public class Vector3Data
{
    public float x;
    public float y;
    public float z;

    public Vector3 ToVector3() => new Vector3(x, y, z);
}

[System.Serializable]
public class QuaternionData
{
    public float x;
    public float y;
    public float z;
    public float w;

    public Quaternion ToQuaternion() => new Quaternion(x, y, z, w);
}

[System.Serializable]
public class Position
{
    public float x;
    public float y;
    public float z;
}

[System.Serializable]
public class Rotation
{
    public float x;
    public float y;
    public float z;
    public float w;
}
