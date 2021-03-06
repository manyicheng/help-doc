import React, {useState} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Button, Toolbar, IconButton, Grid, Box, Typography} from '@mui/material';
import { useStyles } from '@mui/styles';
import MicIcon from '@mui/icons-material/Mic';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import RecordRTC, { StereoAudioRecorder } from 'recordrtc';
import Dropdown from './Dropdown';
import { createTheme, ThemeProvider } from '@material-ui/core/styles';
let socket;
let recorder;


// const default_theme = createTheme({
//     palette: {
//         primary: {
//             main: '#1A1A2E',
//         },
//         secondary: {
//             main: '#ffffff',
//         },
//     }
// });

const Header = (props) => {
    // const history = useHistory();
    // const classes = useStyles();
    const navigate = useNavigate();
    const location = useLocation();
    const {isRecording, setRecording, setText, setLanguage} = props
    const showMic = location.pathname.includes('home')
    const showLanguage = (location.pathname.includes('home') || location.pathname.includes('upload'))


    const aboutOnClick = () =>{
        navigate('../', { replace: true })
    }
    const uploadOnClick = () =>{
        navigate('../', { replace: true })
    }
    const recordOnClick = () =>{
        navigate('../home', { replace: true })
    }

    const micOnClick = async () => {
        // if is recording, close socket, stop recorder, else process the audio
        if (!isRecording) {
            // get temp session token from server.js (backend)
            const response = await fetch('http://localhost:5000');
            const data = await response.json();

            if(data.error){
                alert(data.error)
            }

            const { token } = data;
            // establish wss with AssemblyAI (AAI)
            socket = await new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`);

            // handle incoming messages to display transcription
            const texts = {};
            socket.onmessage = (message) => {
                let msg = '';
                const res = JSON.parse(message.data);
                texts[res.audio_start] = res.text;
                const keys = Object.keys(texts);
                keys.sort((a, b) => a - b);
                for (const key of keys) {
                    if (texts[key]) {
                    msg += ` ${texts[key]}`;
                    }
                }
                setText(msg);
            };

            socket.onerror = (event) => {
                console.error(event);
                socket.close();
            }
            
            socket.onclose = event => {
                console.log(event);
                socket = null;
            }

            socket.onopen = () => {
                // once socket is open, begin recording
                setText('')
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then((stream) => {
                        recorder = new RecordRTC(stream, {
                        type: 'audio',
                        mimeType: 'audio/webm;codecs=pcm', // endpoint requires 16bit PCM audio
                        recorderType: StereoAudioRecorder,
                        timeSlice: 250, // set 250 ms intervals of data that sends to AAI
                        desiredSampRate: 16000,
                        numberOfAudioChannels: 1, // real-time requires only one channel
                        bufferSize: 4096,
                        audioBitsPerSecond: 128000,
                        ondataavailable: (blob) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                            const base64data = reader.result;
            
                            // audio data must be sent as a base64 encoded string
                            if (socket) {
                            socket.send(JSON.stringify({ audio_data: base64data.split('base64,')[1] }));
                            }
                            };
                            reader.readAsDataURL(blob);
                        },
                        });
            
                        recorder.startRecording();
                    })
                    .catch((err) => console.error(err));
                };

        } else {
            // close socket
            if (socket) {
                socket.send(JSON.stringify({terminate_session: true}));
                socket.close();
                socket = null;
            }
            // stop recorder
            if (recorder) {
                recorder.pauseRecording();
                recorder = null;
            }
        }
        setRecording(!isRecording)
    }

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" color = "inherit" enableColorOnDark={true}>
                <Toolbar >
                    <Grid justify="space-between" alignItems="center" container>
                        <Grid item>
                            <img src={'../../logo.png'} className="logo" alt="logo" />
                        </Grid>
                        <Grid item>
                            <Typography size="large"
                                edge="start"
                                color="inherit"
                                sx={{ mr: 2 }}>HelpDoc!</Typography>
                        </Grid>

                        <Grid item>
                            <Button
                                size="large"
                                edge="start"
                                color="inherit"
                                sx={{ mr: 2 }}
                                onClick={aboutOnClick}
                            >About
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button
                                size="large"
                                edge="start"
                                color="inherit"
                                sx={{ mr: 2 }}
                                onClick={() => {
                                    navigate('../home', { replace: true })}}
                            >Record
                            </Button>
                        </Grid>
                        <Grid item>
                            {/* <IconButton aria-label="Upload" component="span" >
                                <DriveFolderUploadIcon sx={{ fontSize: 35 }}/>
                            </IconButton> */}
                            <Button
                                size="large"
                                edge="start"
                                color="inherit"
                                sx={{ mr: 2 }}
                            >
                        <a target="_blank" rel="noopener noreferrer" href="https://devpost.com/software/help-doc?ref_content=existing_user_added_to_software_team&ref_feature=portfolio&ref_medium=email&utm_campaign=software&utm_content=added_to_software_team&utm_medium=email&utm_source=transactional">Feedback</a>
                            Feedback
                            </Button>
                        </Grid>
                        </Grid>
                        <Grid container justify="flex-end" className="right-most">
                            {showMic ? 
                                <Grid item>
                                    <IconButton aria-label="Mic" component="span" onClick={micOnClick}>
                                        {isRecording? <MicOffRoundedIcon sx={{ fontSize: 35 }}/> : <MicIcon sx={{ fontSize: 35 }}/>}
                                    </IconButton>
                                </Grid> : <></>
                            }
                            {showLanguage ?
                                <Grid item>
                                    <Dropdown type="Languages" setLanguage={setLanguage}/>
                                </Grid> : <></>
                            }
                    </Grid>
                </Toolbar>
            </AppBar>
        </Box>
    );
};

export default Header;
