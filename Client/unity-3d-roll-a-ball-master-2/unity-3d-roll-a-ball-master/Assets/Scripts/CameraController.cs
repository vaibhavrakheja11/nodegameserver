using UnityEngine;
using System.Collections;

public class CameraController : MonoBehaviour
{
    [SerializeField] private Vector3 offset; // Offset between camera and player

    private GameObject player;

    [SerializeField]
    private NetworkManager networkManager;

    void Start()
    {
        if (networkManager != null)
        {
            StartCoroutine(InitializeCamera());
        }
        else
        {
            Debug.LogError("NetworkManager not found.");
        }
    }

    private IEnumerator InitializeCamera()
    {
        // Wait until the local player is instantiated
        while (networkManager.GetPlayer() == null)
        {
            Debug.Log("Waiting for player to be instantiated...");
            yield return null;
        }

        // Assign the player object
        player = networkManager.GetPlayer();
        if (player != null)
        {
            Debug.Log("Player found. Setting up camera.");
            offset = transform.position - player.transform.position;
        }
        else
        {
            Debug.LogError("Player object not found in NetworkManager.");
        }
    }

    void LateUpdate()
    {
        if (player != null)
        {
            transform.position = player.transform.position + offset;
        }
    }
}
