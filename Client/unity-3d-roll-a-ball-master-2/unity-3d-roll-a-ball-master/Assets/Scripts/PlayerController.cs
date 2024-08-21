using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class PlayerController : MonoBehaviour
{
    public float speed = 20f;
    private Rigidbody m_Rigidbody;
    private Vector3 m_Movement;
    private int m_Count;
    private NetworkManager networkManager;

    private string clientId;  // Store the client ID for this player

    void Start()
    {
        m_Rigidbody = GetComponent<Rigidbody>();
        m_Count = 0;

        networkManager = FindObjectOfType<NetworkManager>();
        if (networkManager != null)
        {
            // Initialize count and win text from NetworkManager
            networkManager.countText.text = "Count: " + m_Count.ToString();
            networkManager.winText.text = "";

            // Initialize player with clientId
            InitializePlayer(networkManager.GetClientId(), networkManager.GetSessionId());
        }
        else
        {
            Debug.LogError("NetworkManager not found.");
        }
    }

    void FixedUpdate()
    {
        //Debug.Log($"Processing input for clientId: {clientId}");

        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");

        m_Movement.Set(horizontal, 0f, vertical);

        m_Rigidbody.AddForce(m_Movement * speed);
        // Send player update to the server
        networkManager.SendPlayerUpdate(transform.position, transform.rotation);
    }

    public void UpdatePlayerState(Vector3 position, Quaternion rotation)
    {
        // Only update state for non-local players
        if (networkManager.GetClientId() != clientId)
        {
            //Debug.Log($"Updating player state for non-local clientId: {clientId}. New position: {position}, New rotation: {rotation}");
            transform.position = position;
            transform.rotation = rotation;
        }
        else
        {
            //Debug.Log($"Skipping state update for local player clientId: {clientId}");
        }
    }

    public void InitializePlayer(string clientId, string sessionId)
    {
        this.clientId = clientId;
        Debug.Log($"Player initialized with Client ID: {clientId}, Session ID: {sessionId}");

        // Additional initialization code if needed
    }

    public string GetClientId()
    {
        return clientId;  // Return the client ID
    }

    

    void OnTriggerEnter(Collider other)
    {
        if (other.gameObject.CompareTag("PickUp"))
        {
            other.gameObject.SetActive(false);
            m_Count++;
            setCountText();
        }
    }

    void setCountText()
    {
        networkManager.GetCountTextRef().text = "Count: " + m_Count.ToString();
    }
}
