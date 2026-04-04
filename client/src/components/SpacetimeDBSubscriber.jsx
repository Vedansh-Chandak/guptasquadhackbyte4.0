import React, { useEffect } from 'react'
import mockApi from '../api/mockApi'

// SpacetimeDB subscriber component with fallback to mock API
// Connects to actual SpacetimeDB but falls back to polling mock API if connection fails
function SpacetimeDBSubscriber({ onNewHazard, onHazardUpdated }) {
  useEffect(() => {
    let ws = null
    let pollInterval = null
    let isMockFallback = false

    const connectToSpacetimeDB = () => {
      try {
        ws = new WebSocket(import.meta.env.VITE_SPACETIMEDB_HOST || 'ws://localhost:3002')
        
        ws.onopen = () => {
          console.log('Connected to SpacetimeDB')
          isMockFallback = false
          // Clear any mock polling if we're connected to real SpacetimeDB
          if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = null
          }
        }
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          
          switch (data.event) {
            case 'new_hazard_reported':
              onNewHazard(data.payload)
              break
            case 'hazard_upvoted':
              onHazardUpdated(data.payload.hazard_id, 'upvotes', data.payload.new_count)
              break
            case 'hazard_confirmed':
              onHazardUpdated(data.payload.hazard_id, 'confirmations', data.payload.new_count)
              break
            case 'hazard_resolved':
              onHazardUpdated(data.payload.hazard_id, 'status', 'resolved')
              break
            default:
              console.log('Unknown event:', data)
          }
        }
        
        ws.onerror = (error) => {
          console.error('SpacetimeDB connection error:', error)
          // Switch to mock fallback if WebSocket connection fails
          if (!isMockFallback) {
            console.log('Switching to mock API polling fallback...')
            isMockFallback = true
            startMockPolling()
          }
        }
        
        ws.onclose = () => {
          console.log('Disconnected from SpacetimeDB')
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (!isMockFallback) {
              connectToSpacetimeDB()
            }
          }, 5000)
        }
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        isMockFallback = true
        startMockPolling()
      }
    }

    const startMockPolling = () => {
      // Poll mock API for updates when SpacetimeDB connection fails
      const knownHazardIds = new Set()
      pollInterval = setInterval(async () => {
        try {
          const response = await mockApi.getHazards()
          if (response.success) {
            const hazards = response.hazards || response.data || []
            console.log('Mock API polling - got', hazards.length, 'hazards')

            hazards.forEach((hazard) => {
              const hazardId = hazard._id || hazard.id
              if (!hazardId) {
                return
              }

              if (!knownHazardIds.has(hazardId)) {
                knownHazardIds.add(hazardId)
                if (typeof onNewHazard === 'function') {
                  onNewHazard(hazard)
                }
              }
            })
          }
        } catch (error) {
          console.error('Error polling mock API:', error)
        }
      }, 5000) // Poll every 5 seconds
    }

    // Initial connection attempt
    connectToSpacetimeDB()

    // Cleanup function
    return () => {
      if (ws) {
        ws.close()
      }
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [onNewHazard, onHazardUpdated])
  
  return null
}

export default SpacetimeDBSubscriber
