


import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useFBX, PerspectiveCamera } from '@react-three/drei';
import { AnimationMixer, Vector3 } from 'three';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function useWebSocket(url) {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [receivedData, setReceivedData] = useState(null); 
    const wsRef = useRef(null);

    const audioContextRef = new (window.AudioContext || window.webkitAudioContext)();

    function convertPCMToAudioBuffer(pcmData, audioContext) {
        const sampleRate = 44100;
        const channels = 1;
        const samples = pcmData.length / 2;

        const audioBuffer = audioContext.createBuffer(channels, samples, sampleRate);
        const floatBuffer = audioBuffer.getChannelData(0);

        for (let i = 0; i < samples; i++) {
            // 16-bit PCM to float (-1.0 to 1.0)
            const low = pcmData[i * 2];
            const high = pcmData[i * 2 + 1];
            const sample = (high << 8) | low;
            floatBuffer[i] = sample / 32768.0;
        }

        return audioBuffer;
    }

    function playAudioBuffer(audioContext, audioBuffer) {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
    }


    useEffect(() => {
        const connect = () => {
            try {
                wsRef.current = new WebSocket(url);

                wsRef.current.onopen = () => {
                    console.log('WebSocket connected');
                    setIsConnected(true);
                    setError(null);
                };

                wsRef.current.onclose = (event) => {
                    console.log('WebSocket closed:', event);
                    setIsConnected(false);
                    // Attempt to reconnect after 3 seconds
                    setTimeout(connect, 3000);
                };

                wsRef.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setError(error);
                };

                wsRef.current.onmessage = (event) => {
                    let event_parsed;
                    try {
                        event_parsed = JSON.parse(event.data);
                        setReceivedData(event_parsed);

                        // if(event_parsed && event_parsed.is_text == false){
                        //     console.log(event_parsed.audio , "RECIVED DATA")

                        //     const base64Data = event_parsed.audio;
                        //     const raw = atob(base64Data); // decode base64
                        //     const buffer = new ArrayBuffer(raw.length);
                        //     const view = new Uint8Array(buffer);

                        //     for (let i = 0; i < raw.length; i++) {
                        //         view[i] = raw.charCodeAt(i);
                        //     }

                        //     // Assuming it's 16-bit PCM mono audio
                        //     const audioBuffer = convertPCMToAudioBuffer(view, audioContextRef.current);
                        //     playAudioBuffer(audioContextRef.current, audioBuffer);


                        // }


                    } catch (error) {
                        console.error("Error parsing WebSocket message:", error);
                        return;
                    }
                };

            } catch (err) {
                console.error('WebSocket connection error:', err);
                setError(err);
                // Reconnect after 3 seconds
                setTimeout(connect, 3000);
            }
        };

        connect();

        // Cleanup on unmount
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [url]);

    // Function to send audio data
    const sendAudioData = (audioData) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(audioData);
        } else {
            console.warn('WebSocket is not connected');
        }
    };

    const sendTextData = (textData) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ "transcibed_text": textData }));
        } else {
            console.warn('WebSocket is not connected');
        }
    };

    return { isConnected, error, sendAudioData, sendTextData, receivedData };
}

// Camera Controller Component
function CameraController({ follow, isListening }) {
    const { camera } = useThree();
    const initialPosition = useRef(new Vector3(0, 3, 8));
    const targetPosition = useRef(new Vector3(0, 3, 8));

    useEffect(() => {
        // Set initial camera position much higher up and further back
        camera.position.set(0, 3, 8);
        initialPosition.current.copy(camera.position);

        // Log camera setup for debugging
        console.log("Camera initialized at:", camera.position);
    }, [camera]);

    useEffect(() => {
        if (isListening) {
            // When listening, shift camera position way to the right
            // But pull back a bit on Z to see more of the avatar
            targetPosition.current.set(16, 3, 10);
        } else {
            // Reset camera to front view
            targetPosition.current.copy(initialPosition.current);
        }

        console.log("Camera target changed to:", targetPosition.current);
    }, [isListening]);

    useFrame(() => {
        // Smoothly interpolate camera position
        camera.position.lerp(targetPosition.current, 0.05);

        // Always look at a fixed point in front of the avatar
        // This keeps the avatar facing forward
        const lookTarget = new Vector3(0, 1.5, 0); // Look slightly higher
        if (follow.current) {
            // Get X position from follow target but keep Y and Z fixed
            lookTarget.x = follow.current.position.x;
        }

        camera.lookAt(lookTarget);
    });

    return null;
}



function Character({ onLoaded, triggerWalk, triggerGreeting, characterRef }) {
    const standingUpFBX = useFBX('/avatars/StandingUp.fbx');
    const standingGreetingFBX = useFBX('/avatars/StandingGreeting.fbx');
    const rightTurnFBX = useFBX('/avatars/RightTurn.fbx');

    console.log('FBX Loading Status:', {
        standingUp: standingUpFBX ? 'Loaded' : 'Failed',
        standingGreeting: standingGreetingFBX ? 'Loaded' : 'Failed',
        rightTurn: rightTurnFBX ? 'Loaded' : 'Failed'
    });
    const mixer = useRef(null);
    const actions = useRef({});
    const [isLoaded, setIsLoaded] = useState(false);
    const model = useRef();
    const targetRotation = useRef(new THREE.Euler(0, 0, 0));

    useEffect(() => {
        if (
            standingUpFBX.animations.length > 0 &&
            standingGreetingFBX.animations.length > 0 &&
            rightTurnFBX.animations.length > 0
        ) {
            mixer.current = new AnimationMixer(standingGreetingFBX);

            actions.current.standingUp = mixer.current.clipAction(standingUpFBX.animations[0]);
            actions.current.greeting = mixer.current.clipAction(standingGreetingFBX.animations[0]);
            actions.current.rightTurn = mixer.current.clipAction(rightTurnFBX.animations[0]);

            // Set default animation
            actions.current.greeting.play();

            setIsLoaded(true);
            onLoaded();
        }

        return () => mixer.current?.stopAllAction();
    }, [standingGreetingFBX, rightTurnFBX, onLoaded]);

    useEffect(() => {
        if (triggerWalk && actions.current.rightTurn && actions.current.greeting) {
            // We don't want the right turn animation to actually play
            // Instead just keep the greeting animation playing
            // actions.current.greeting.fadeOut(0.3);
            // actions.current.rightTurn.reset().fadeIn(0.3);
            // actions.current.rightTurn.setLoop(THREE.LoopOnce, 1);
            // actions.current.rightTurn.clampWhenFinished = true;
            // actions.current.rightTurn.play();

            // Keep playing the greeting animation but move the avatar to the right
            console.log("Moving avatar to the right");
        }
    }, [triggerWalk]);

    useEffect(() => {
        if (triggerGreeting && actions.current.greeting) {
            // Transition back to greeting
            actions.current.rightTurn.fadeOut(0.3);
            actions.current.greeting.reset().fadeIn(0.3).play();

            // Reset target rotation
            targetRotation.current = new THREE.Euler(0, 0, 0);
        }
    }, [triggerGreeting]);

    useFrame((_, delta) => {
        // Update animation mixer
        mixer.current?.update(delta);

        // Smooth rotation to target
        if (model.current) {
            model.current.rotation.y = THREE.MathUtils.lerp(
                model.current.rotation.y,
                targetRotation.current.y,
                delta * 3
            );
        }
    });

    return isLoaded ? (
        <group ref={characterRef} position={[0, -2, 0]}>
            <primitive
                ref={model}
                object={standingGreetingFBX}
                scale={0.04} // Increase scale from 0.03 to 0.05
                rotation={[0, 0, 0]}
                position={[0, 0, 0]}
            />
            {/* Debug sphere at top of avatar's head */}
            <mesh position={[0, 5, 0]} visible={false}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial color="hotpink" />
            </mesh>

            {/* Debug axis helper */}
            <axesHelper args={[5]} visible={false} />
        </group>
    ) : (
        // Show a placeholder while loading
        <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1, 2, 1]} />
            <meshStandardMaterial color="gray" wireframe />
        </mesh>
    );
}

// Create a fallback avatar if FBX files aren't loading
function FallbackAvatar({ characterRef, targetX }) {
    const [rotY, setRotY] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRotY(prev => prev + 0.01);
        }, 16);

        return () => clearInterval(interval);
    }, []);

    useFrame((_, delta) => {
        // Smooth position to target X
        if (characterRef.current) {
            // Create target position based on targetX
            const targetPosition = new THREE.Vector3(targetX, 0, 0);

            // Smoothly interpolate position
            characterRef.current.position.lerp(targetPosition, delta * 2);
        }
    });

    return (
        <group ref={characterRef} position={[0, 0, 0]}>
            {/* Body */}
            <mesh position={[0, 0, 0]}>
                <capsuleGeometry args={[0.8, 2.5, 10, 20]} />
                <meshStandardMaterial color="#4287f5" />
            </mesh>

            {/* Head */}
            <mesh position={[0, 2, 0]} rotation={[0, rotY, 0]}>
                <sphereGeometry args={[0.7, 20, 20]} />
                <meshStandardMaterial color="#f5d742" />

                {/* Eyes */}
                <mesh position={[0.3, 0.1, 0.5]}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[-0.3, 0.1, 0.5]}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshStandardMaterial color="black" />
                </mesh>

                {/* Mouth */}
                <mesh position={[0, -0.3, 0.5]} rotation={[0, 0, 0]}>
                    <boxGeometry args={[0.5, 0.12, 0.1]} />
                    <meshStandardMaterial color="black" />
                </mesh>
            </mesh>

            {/* Arms */}
            <mesh position={[1.2, 0, 0]} rotation={[0, 0, Math.PI / 2 - 0.5]}>
                <capsuleGeometry args={[0.3, 1.5, 8, 16]} />
                <meshStandardMaterial color="#4287f5" />
            </mesh>
            <mesh position={[-1.2, 0, 0]} rotation={[0, 0, -Math.PI / 2 + 0.5]}>
                <capsuleGeometry args={[0.3, 1.5, 8, 16]} />
                <meshStandardMaterial color="#4287f5" />
            </mesh>

            {/* Legs */}
            <mesh position={[0.5, -2, 0]} rotation={[0, 0, 0]}>
                <capsuleGeometry args={[0.4, 1.5, 8, 16]} />
                <meshStandardMaterial color="#4287f5" />
            </mesh>
            <mesh position={[-0.5, -2, 0]} rotation={[0, 0, 0]}>
                <capsuleGeometry args={[0.4, 1.5, 8, 16]} />
                <meshStandardMaterial color="#4287f5" />
            </mesh>
        </group>
    );
}

// Web Speech API integration
function useSpeechRecognition() {
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const recognitionRef = useRef(null);

    // Create recognition instance only once
    useEffect(() => {
        // Browser compatibility check
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            try {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';

                console.log('Speech recognition initialized successfully');
            } catch (error) {
                console.error('Error initializing speech recognition:', error);
            }
        } else {
            console.error('Speech Recognition API not supported in this browser');
            alert('Speech Recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    // Always stop recognition when unmounting
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore errors on cleanup
                }
            }
        };
    }, []);

    // Set up event handlers when listening state changes
    useEffect(() => {
        if (!recognitionRef.current) return;

        // Event handlers
        const handleStart = () => {
            console.log('Speech recognition STARTED');
            setIsRecognizing(true);
        };

        const handleResult = (event) => {
            let interimText = '';
            let finalText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += transcript + ' ';
                    // console.log('Final transcript added:', transcript);
                } else {
                    interimText += transcript;
                }
            }

            if (interimText) {
                // console.log('Interim transcript:', interimText);
                setInterimTranscript(interimText);
            }

            if (finalText) {
                // console.log('Final transcript:', finalText);
                // Append to existing transcript rather than replacing
                setTranscript(prev => finalText);
                setInterimTranscript('');
            }
        };

        const handleError = (event) => {
            console.error('Speech recognition error:', event.error);
            // Show user feedback for permission errors
            if (event.error === 'not-allowed') {
                alert('Microphone permission was denied. Please allow microphone access and try again.');
            }
            setIsRecognizing(false);
        };

        const handleEnd = () => {
            console.log('Speech recognition ENDED');
            setIsRecognizing(false);

            // If still in listening mode, restart recognition
            if (isListening) {
                console.log('Restarting speech recognition...');
                setTimeout(() => {
                    try {
                        recognitionRef.current.start();
                    } catch (e) {
                        console.error('Error restarting recognition', e);
                    }
                }, 300);
            }
        };

        // Add event listeners
        recognitionRef.current.onstart = handleStart;
        recognitionRef.current.onresult = handleResult;
        recognitionRef.current.onerror = handleError;
        recognitionRef.current.onend = handleEnd;

        // Start/stop based on isListening state
        if (isListening) {
            try {
                console.log('Starting speech recognition...');
                recognitionRef.current.start();
                // Force isRecognizing true to show UI immediately
                setIsRecognizing(true);
            } catch (e) {
                console.error('Error starting speech recognition', e);
                if (e.name === 'InvalidStateError') {
                    console.log('Recognition already started, stopping and restarting...');
                    try {
                        recognitionRef.current.stop();
                        // Small delay before restarting
                        setTimeout(() => {
                            recognitionRef.current.start();
                        }, 100);
                    } catch (stopError) {
                        console.error('Error stopping prior recognition instance', stopError);
                    }
                }
            }
        } else if (recognitionRef.current) {
            try {
                console.log('Stopping speech recognition...');
                recognitionRef.current.stop();
            } catch (e) {
                console.error('Error stopping speech recognition', e);
            }
        }

        // Cleanup function
        return () => {
            // Remove event listeners if recognition instance exists
            if (recognitionRef.current) {
                recognitionRef.current.onstart = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
            }
        };
    }, [isListening]);

    // Start listening function
    const startListening = () => {
        console.log('startListening() called');
        // Clear previous transcript when starting new session
        setTranscript('');
        setInterimTranscript('');
        setIsListening(true);
    };

    // Stop listening function
    const stopListening = () => {
        console.log('stopListening() called');
        setIsListening(false);
        // Clear the last transcript sent when stopping to ensure a fresh start next time
        setTranscript('');
        setInterimTranscript('');
    };

    return {
        transcript,
        interimTranscript,
        isListening,
        isRecognizing,
        startListening,
        stopListening
    };
}

function MicButton({ onClick, isListening }) {
    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
                position: 'relative',
                textAlign: 'center',
            }}
        >
            <motion.button
                onClick={onClick}
                initial={{ boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}
                whileHover={{
                    scale: 1.05,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3), 0 0 25px rgba(35, 166, 213, 0.5)'
                }}
                whileTap={{ scale: 0.95 }}
                style={{
                    width: '100px',
                    height: '100px',
                    fontSize: '2.2rem',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #23a6d5, #23d5ab)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <div style={{ position: 'relative', zIndex: 2 }}>
                    {/* Mic icon */}
                    🎤
                </div>

                {/* Animated Ring Effect */}
                <motion.div
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.7, 0, 0.7],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        border: '2px solid white',
                        borderRadius: '50%',
                        opacity: 0,
                    }}
                />
            </motion.button>
            <motion.div
                animate={{
                    y: [0, 5, 0],
                    opacity: [0.8, 1, 0.8]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{
                    marginTop: '15px',
                    color: 'white',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                    fontWeight: 'bold',
                    fontSize: '18px',
                }}
            >
                {isListening ? "Tap to stop" : "Lets Talk !"}
            </motion.div>
        </motion.div>
    );
}

// Main Page
export default function LandingPage() {
    const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
    const [triggerWalk, setTriggerWalk] = useState(false);
    const [triggerGreeting, setTriggerGreeting] = useState(false);
    const [avatarX, setAvatarX] = useState(0);
    const [useFallbackAvatar, setUseFallbackAvatar] = useState(false);
    const characterRef = useRef(new THREE.Group());
    const [showProducts, setShowProducts] = useState(false);
    const [productsData, setProductsData] = useState([]);
    const mediaRecorderRef = useRef(null);
    const audioChunks = useRef([]);
    const [shouldEndSession, setShouldEndSession] = useState(false);
    const MotionLink = motion(Link);

    // Ref to track the last sent transcript to avoid duplicates
    const lastSentTranscriptRef = useRef('');
    // State to store the AI response from WebSocket
    const [aiResponse, setAiResponse] = useState("");

    const { isConnected, error, sendAudioData, sendTextData, receivedData } = useWebSocket('ws://localhost:8000/ws/device?language=english');



    useEffect(() => {
        console.log('WebSocket connection status:', isConnected);
        if (error) {
            console.error('WebSocket error:', error);
        }
    }, [isConnected, error]);

    // Handle received WebSocket data
    useEffect(() => {
        if (receivedData && receivedData.is_transcription == false) {
            console.log(`RecivedMsg : ${receivedData.msg} IsEnd : ${receivedData.is_end}`)
            // final response
            if (receivedData.is_text === true && receivedData.is_end === true && receivedData.msg) {
                setAiResponse(prev => receivedData.msg);
            }

            else if (receivedData.is_text === true && receivedData.is_json === true) {
                // console.log("THIS IS JSON DATA : ", receivedData.msg)
                setProductsData(receivedData.msg);
                setShowProducts(true);
            }

            // Process incoming text from the WebSocket
            else if (receivedData.is_text === true && receivedData.msg) {
                // Append new word to existing AI response
                setAiResponse(prev => prev + ' ' + receivedData.msg);
            }

        }
    }, [receivedData]);

    const {
        transcript,
        interimTranscript,
        isListening,
        isRecognizing,
        startListening,
        stopListening
    } = useSpeechRecognition();

    // Set up audio stream when starting to listen
    useEffect(() => {
        if (isListening) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    mediaRecorderRef.current = new MediaRecorder(stream);

                    mediaRecorderRef.current.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            // Send audio chunk directly through WebSocket
                            // sendAudioData(event.data);
                        }
                    };

                    // Start recording in small chunks for real-time streaming
                    mediaRecorderRef.current.start(100); // Capture chunks every 100ms
                })
                .catch(err => console.error('Error accessing microphone:', err));

            return () => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
            };
        }
    }, [isListening, sendAudioData]);


    // Send transcript to server only when it changes
    useEffect(() => {
        if (transcript && transcript !== lastSentTranscriptRef.current) {
            console.log('Sending Transcript to server:', transcript);
            // Send the transcript to the server
            sendTextData(transcript);

            // Update the last sent transcript reference
            lastSentTranscriptRef.current = transcript;

        }
    }, [transcript, sendTextData]);

    // Separate effect for handling session end if needed
    useEffect(() => {
        if (shouldEndSession) {
            console.log("Ending listening mode due to explicit request...");
            stopListening();
            setTriggerWalk(false);
            setTriggerGreeting(true);
            setAvatarX(0); // Return avatar to center

            // Reset greeting trigger after animation completes
            setTimeout(() => {
                setTriggerGreeting(false);
                setShouldEndSession(false); // Reset flag
            }, 2000);
        }
    }, [shouldEndSession, stopListening]);

    const handleAvatarLoad = () => {
        setIsAvatarLoaded(true);
    };

    const handleMicClick = () => {
        if (isListening) {
            // User explicitly clicked to stop
            stopListening();
            setShowProducts(false); // Hide products when stopping
            setTriggerWalk(false);
            setTriggerGreeting(true);
            setAvatarX(0); // Return avatar to center
            // Reset the last sent transcript reference when stopping
            lastSentTranscriptRef.current = '';
            // Clear the AI response when stopping
            setAiResponse('');
        } else {
            // Start listening mode
            startListening();
            setTriggerWalk(true);
            setAvatarX(10); // Move avatar to the right
            // Clear any previous AI response
            setAiResponse('');
        }
    };

    // Function to explicitly end the session from a button or command
    const endSession = () => {
        setShouldEndSession(true);
        setShowProducts(false);
        setAiResponse(''); // Clear AI response when session ends
    };

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            background: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
            backgroundSize: '400% 400%',
            animation: 'gradientBG 15s ease infinite',
            position: 'relative',
        }}>
            {/* Custom style for background animation */}
            <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
      `}</style>

            {/* Debugging Info */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                zIndex: 1000,
                fontSize: '12px',
                fontFamily: 'monospace',
                display : "none", // comment this for testing
            }}>
                Avatar Loaded: {isAvatarLoaded ? 'Yes' : 'No'}<br />
                Current State: {isListening ? 'Listening' : 'Idle'}<br />
                Recognizing: {isRecognizing ? 'Yes' : 'No'}<br />
                Position X: {avatarX}<br />
                WebSocket: {isConnected ? 'Connected' : 'Disconnected'}<br />
                <button
                    onClick={() => console.log('Character ref:', characterRef.current)}
                    style={{ marginTop: '5px', padding: '3px' }}
                >
                    Log Refs
                </button>
                <button
                    onClick={endSession}
                    style={{ marginTop: '5px', marginLeft: '5px', padding: '3px' }}
                >
                    Force End
                </button>
            </div>

            {/* 3D Canvas with avatar */}
            <Canvas>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <spotLight position={[5, 5, 5]} intensity={0.8} castShadow />

                {/* Camera that follows character */}
                <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={60} />
                <CameraController follow={characterRef} isListening={isListening} />

                {/* Motion wrapper for avatar movement */}
                <motion.group
                    animate={{
                        x: avatarX
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 50,
                        damping: 15
                    }}
                >
                    {useFallbackAvatar ? (
                        <FallbackAvatar characterRef={characterRef} />
                    ) : (
                        <Character
                            onLoaded={handleAvatarLoad}
                            triggerWalk={triggerWalk}
                            triggerGreeting={triggerGreeting}
                            characterRef={characterRef}
                        />
                    )}
                </motion.group>

                {/* Limited orbit controls - only enable rotation, not zoom */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    minPolarAngle={Math.PI / 3}
                    maxPolarAngle={Math.PI / 2}
                />
            </Canvas>

            {/* Fancy Mic Button in Center - only show when not listening */}
            {!isListening && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 50,
                }}>
                    <MicButton onClick={handleMicClick} isListening={isListening} />
                </div>
            )}

            {/* Speech Panel - ALWAYS SHOW when isListening is true */}
            {isListening && (
                <div
                    style={{
                        position: 'absolute',
                        top: '20%',
                        left: '2%',
                        width: '40%', // Wider panel
                        maxWidth: '500px',
                        transform: 'none', // Remove translateY to position explicitly
                        zIndex: 1000,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        padding: '15px',
                        borderRadius: '15px',
                        boxShadow: '0 5px 25px rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                >
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                        padding: '5px 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        <div style={{
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            textShadow: '0 0 10px rgba(0,0,0,0.5)',
                        }}>
                            Virtual Assistant {isRecognizing ? '(Active)' : '(Connecting...)'}
                        </div>
                        <motion.button
                            onClick={handleMicClick}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            style={{
                                backgroundColor: 'rgba(255, 0, 0, 0.6)',
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 0 15px rgba(255, 0, 0, 0.3)'
                            }}
                        >
                            <span style={{ color: 'white', fontSize: '16px' }}>✕</span>
                        </motion.button>
                    </div>

                    {/* Simplified Speaking Animation - Just shows waves and transcript */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        height: '50px',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '10px'
                    }}>
                        {[...Array(10)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    height: ['30%', `${(0.5 + Math.random() * 1.5) * (30 + i * 3)}%`, '30%']
                                }}
                                transition={{
                                    duration: 0.7 + Math.random() * 0.3,
                                    repeat: Infinity,
                                    delay: i * 0.05,
                                }}
                                style={{
                                    width: '4px',
                                    backgroundColor: i % 3 === 0 ? '#23d5ab' : i % 3 === 1 ? '#23a6d5' : 'white',
                                    borderRadius: '4px',
                                    opacity: 0.8,
                                    boxShadow: '0 0 10px rgba(255,255,255,0.3)'
                                }}
                            />
                        ))}
                    </div>

                    {/* Status message */}
                    <div style={{
                        color: 'white',
                        textAlign: 'center',
                        marginBottom: '10px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                    }}>
                        I'm listening...
                    </div>

                    {/* Transcript display - Fixed to not exceed the box */}
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginTop: '5px',
                        fontSize: '15px',
                        color: 'white',
                        minHeight: '40px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        width: '100%',
                        textAlign: 'left',
                        overflowY: 'auto',
                        maxHeight: '60px',
                        wordWrap: 'break-word', // Ensure text wraps inside the box
                        boxSizing: 'border-box' // Include padding in width calculation
                    }}>
                        {transcript || interimTranscript || "Waiting for speech..."}
                    </div>

                    {/* AI Response display - Shows text received from WebSocket */}
                    {aiResponse && (
                        <motion.div
                            initial={{ y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            style={{
                                backgroundColor: 'rgba(35, 166, 213, 0.3)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                marginTop: '15px',
                                fontSize: '15px',
                                color: 'white',
                                minHeight: '40px',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(35, 166, 213, 0.4)',
                                width: '100%',
                                textAlign: 'left',
                                overflowY: 'auto',
                                maxHeight: '120px', // Taller than the transcript box
                                wordWrap: 'break-word',
                                boxSizing: 'border-box',
                                position: 'relative',
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '-8px',
                                left: '15px',
                                backgroundColor: 'rgba(35, 166, 213, 0.8)',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '12px',
                                color: 'white',
                                fontWeight: 'bold',
                            }}>
                                AI Response
                            </div>
                            <div style={{ marginTop: '5px' }}>
                                {aiResponse.trim() || "..."}
                            </div>
                        </motion.div>
                    )}

                    {/* Product cards - Use explicit state to control showing products */}
                    {(showProducts && productsData) && (
                        <div style={{
                            marginTop: '15px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}>
                            <div style={{
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                textAlign: 'left',
                                marginBottom: '10px'
                            }}>
                                Here are our products:

                            </div>

                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '12px',
                                justifyContent: 'space-between'
                            }}>



                                {productsData.map((product, idx) => (
                                    <MotionLink
                                        to={`/products/${product.id}`}
                                        key={product.id || idx}
                                        initial={{ y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 * idx, duration: 0.4 }}
                                        style={{
                                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                            borderRadius: '10px',
                                            padding: '15px',
                                            width: 'calc(50% - 6px)',
                                            boxSizing: 'border-box',
                                            border: `2px solid ${['#23d5ab', '#23a6d5', '#e73c7e', '#ee7752'][idx % 4]}`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                                            color: 'inherit',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        <div style={{
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '50%',
                                            backgroundColor: ['#23d5ab', '#23a6d5', '#e73c7e', '#ee7752'][idx % 4],
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: '10px',
                                            boxShadow: `0 0 15px ${['rgba(35,213,171,0.5)', 'rgba(35,166,213,0.5)', 'rgba(231,60,126,0.5)', 'rgba(238,119,82,0.5)'][idx % 4]}`
                                        }}>
                                            <span style={{ fontSize: '15px' }}>{product.price || '🛒'}</span>
                                        </div>
                                        <div style={{
                                            color: 'white',
                                            fontWeight: 'bold',
                                            marginBottom: '5px',
                                            fontSize: '16px'
                                        }}>
                                            {product.name || 'Product Name'}
                                        </div>
                                        <div style={{
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            fontSize: '13px',
                                            textAlign: 'center'
                                        }}>
                                            {product.description || 'Product description goes here.'}
                                        </div>
                                    </MotionLink>
                                ))}


                            </div>

                            {/* Force extra space below cards so they're fully visible */}
                            <div style={{ height: '20px' }}></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
