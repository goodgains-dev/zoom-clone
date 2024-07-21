'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { StreamChat, Channel, ChannelFilters, ChannelSort, DefaultGenerics } from 'stream-chat';
import {
  Chat,
  Channel as StreamChannelComponent,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window
} from 'stream-chat-react';
import { StreamVideoParticipant, useStreamVideoClient, Call, CallRecording } from '@stream-io/video-react-sdk';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import 'stream-chat-react/dist/css/index.css';
import { FaTwitter, FaLinkedin, FaGithub, FaPhone, FaVideo, FaUserPlus, FaLink, FaCreditCard, FaRobot, FaCalendar, FaTasks } from 'react-icons/fa';
import { tokenProvider } from '@/actions/stream.actions';
import Loader from '@/components/Loader';
import {
  Button,
  TextField,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useGetCalls } from '@/hooks/useGetCalls';
import MeetingCard from '@/components/MeetingCard';
import Confetti from 'react-confetti';
import axios from 'axios';


const colorShift = keyframes`
  0% {
    background-color: #ff9a9e;
  }
  20% {
    background-color: #fad0c4;
  }
  40% {
    background-color: #fad0c4;
  }
  60% {
    background-color: #fad0c4;
  }
  80% {
    background-color: #ff9a9e;
  }
  100% {
    background-color: #ff9a9e;
  }
`;

const liquidBorder = keyframes`
  0% {
    border-color: #ff9a9e;
  }
  50% {
    border-color: #fad0c4;
  }
  100% {
    border-color: #ff9a9e;
  }
`;

const Container = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  ${css`
    animation: ${colorShift} 10s infinite alternate;
  `}
  text-align: black;
  overflow: hidden; /* Prevent scrolling */
`;

const ShiftingButton = styled(Button)`
  ${css`
    animation: ${colorShift} 10s infinite alternate;
  `}
  color: white;
`;

const GlassTextField = styled(TextField)`
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const LiquidBox = styled.div`
  border: 2px solid;
  ${css`
    animation: ${liquidBorder} 5s infinite;
  `}
  padding: 16px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: calc(100vh - 100px); /* Ensure equal height for all columns */
  overflow: hidden; /* Prevent inner scrolling */
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  height: 100%;
  overflow-y: auto; /* Allow vertical scrolling */
`;

const BottomNav = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px;
  display: flex;
  justify-content: space-around;
  opacity: 0;
  transition: opacity 0.3s;

  &:hover {
    opacity: 1;
  }
`;

const Cube = () => (
  <mesh scale={0.5}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="orange" />
  </mesh>
);

import * as THREE from 'three';

const CoinbaseLogo = ({ logoUrl }: { logoUrl: string }) => {
  const logoRef = useRef<THREE.Object3D>(null);
  const gltf = useLoader(GLTFLoader, logoUrl || '/Coinbase.glb');

  useFrame(() => {
    if (logoRef.current) {
      logoRef.current.rotation.y += 0.02;
    }
  });

  return (
    <primitive object={gltf.scene} ref={logoRef} scale={0.5} />
  );
};

const PersonalRoom: React.FC = () => {
  const { user, isLoaded } = useUser();
  const [client, setClient] = useState<StreamChat<DefaultGenerics> | null>(null);
  const [channels, setChannels] = useState<Channel<DefaultGenerics>[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel<DefaultGenerics> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const { toast } = useToast();
  const [inviteLink, setInviteLink] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [setParticipants] = useState<StreamVideoParticipant[]>([]);
  const [modelType, setModelType] = useState('cube');
  const [background, setBackground] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const videoClient = useStreamVideoClient();
  const router = useRouter();

  useEffect(() => {
    const initChat = async () => {
      if (!user || !isLoaded) return;

      try {
        const streamClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!);
        const token = await tokenProvider();

        await streamClient.connectUser(
          {
            id: user.id,
            name: user.username || user.id,
            image: user.setProfileImage,
          },
          token
        );

        const filters: ChannelFilters<DefaultGenerics> = { members: { $in: [user.id] } };
        const sort: ChannelSort<DefaultGenerics> = [{ last_message_at: -1 as any }];
        const fetchedChannels = await streamClient.queryChannels(filters, sort);
        setChannels(fetchedChannels);

        if (fetchedChannels.length > 0) {
          setActiveChannel(fetchedChannels[0]);
          const membersWithRoles = await fetchedChannels[0].queryMembers({});
          const rolesMap: Record<string, string> = {};
          membersWithRoles.members.forEach(member => {
            if (member.user_id) {
              rolesMap[member.user_id] = member.role!;
            }
          });
          setRoles(rolesMap);
        } else {
          const defaultChannel = streamClient.channel('messaging', `default-${user.id}`, {
            name: 'Default Channel',
            members: [user.id],
          });
          await defaultChannel.create();
          setChannels([defaultChannel]);
          setActiveChannel(defaultChannel);
        }

        setClient(streamClient);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('Failed to initialize chat');
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    return () => {
      if (client) {
        client.disconnectUser();
      }
    };
  }, [user, isLoaded]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (activeChannel) {
        const response = await activeChannel.queryMembers({});
        setMembers(response.members);
      }
    };

    fetchMembers();
  }, [activeChannel]);

  const handleInvite = async () => {
    if (!activeChannel) return;

    try {
      const inviteLink = `${window.location.origin}/join/${activeChannel.id}`;
      setInviteLink(inviteLink);
      navigator.clipboard.writeText(inviteLink);
      toast({ title: 'Success', description: 'Invite link copied to clipboard' });
    } catch (error) {
      console.error('Error generating invite link:', error);
      toast({ title: 'Error', description: 'Failed to generate invite link' });
    }
  };

  const handleCreateChannel = async () => {
    if (!client || !newChannelName) return;

    try {
      const newChannel = client.channel('messaging', `channel-${newChannelName}-${user?.id ?? ''}`, {
        name: newChannelName,
        members: [user?.id ?? ''],
      });
      await newChannel.create();
      setChannels([...channels, newChannel]);
      setActiveChannel(newChannel);
      setNewChannelName('');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      toast({ title: 'Success', description: 'Channel created successfully' });
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({ title: 'Error', description: 'Failed to create channel' });
    }
  };

  const handleDeleteChannel = async () => {
    if (!activeChannel) return;

    try {
      await activeChannel.delete();
      setChannels(channels.filter(channel => channel.id !== activeChannel.id));
      setActiveChannel(null);
      toast({ title: 'Success', description: 'Channel deleted successfully' });
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({ title: 'Error', description: 'Failed to delete channel' });
    }
  };

  const handleStartCall = async (callType: 'audio_room' | 'video') => {
    if (!videoClient || !activeChannel) {
      toast({ title: 'Error', description: 'Cannot start call. Video client or channel is missing.' });
      return;
    }

    try {
      const id = crypto.randomUUID();
      const call = videoClient.call(callType, id);
      if (!call) throw new Error('Failed to create call');

      await call.getOrCreate({
        data: {
          members: [{ user_id: user?.id ?? '' }],
        },
      });

      const callLink = `${window.location.origin}/meeting/${call.id}`;
      activeChannel.sendMessage({
        text: `Join the call: ${callLink}`,
        customType: 'call',
      });

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      router.push(callLink);
      setParticipants;
    } catch (error) {
      console.error('Error starting call:', error);
      toast({ title: 'Error', description: `Failed to start ${callType} call}` });
    }
  };

  const handleJoinChannel = async () => {
    if (!inviteLink) return;

    try {
      const streamClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!);
      const token = await tokenProvider();

      await streamClient.connectUser(
        {
          id: user?.id ?? '',
          name: user?.username || (user?.id ?? ''),
          image: user?.setProfileImage,
        },
        token
      );

      const channelId = inviteLink.split('/').pop();
      const channel = streamClient.channel('messaging', channelId!);
      await channel.addMembers([user?.id ?? '']);

      setActiveChannel(channel);
      toast({ title: 'Success', description: 'Joined channel successfully' });
    } catch (error) {
      console.error('Error joining channel:', error);
      toast({ title: 'Error', description: 'Failed to join channel' });
    }
  };
  
  const handleBackgroundChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const backgroundUrl = e.target?.result as string;
        setBackground(backgroundUrl);
        localStorage.setItem('backgroundUrl', backgroundUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoUrl = e.target?.result as string;
        setLogoUrl(logoUrl);
        localStorage.setItem('logoUrl', logoUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const profileImageUrl = e.target?.result as string;
        handleUpdateChannelAvatar(profileImageUrl);
        localStorage.setItem('profileImageUrl', profileImageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateChannelAvatar = async (profileImageUrl: string) => {
    if (!activeChannel) return;

    try {
      await activeChannel.updatePartial({ set: { image: profileImageUrl } });
      toast({ title: 'Success', description: 'Channel avatar updated successfully' });
    } catch (error) {
      console.error('Error updating channel avatar:', error);
      toast({ title: 'Error', description: 'Failed to update channel avatar' });
    }
  };

  const renderModel = () => {
    switch (modelType) {
      case 'cube':
        return <Cube />;
      default:
        return <Cube />;
    }
  };

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
  };

  const handleCloseProfileModal = () => {
    setSelectedMember(null);
  };

  const handleSubscribe = async () => {
    setIsSubscriptionModalOpen(true);
  };

  const handleAiSubmit = async () => {
    try {
      const response = await axios.post('/api/openai', {
        prompt: aiPrompt,
      });
      setAiResponse(response.data.result);
    } catch (error) {
      console.error('Error generating response:', error);
    }
  };

  const ProfileModal: React.FC<{ member: any }> = ({ member }) => {
    return (
      <Dialog open={true} onClose={handleCloseProfileModal}>
        <DialogTitle>
          {member.user.name || member.user.id}
          <IconButton
            aria-label="close"
            onClick={handleCloseProfileModal}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <List>
            <ListItem>
              <ListItemAvatar>
                <Avatar src={member.user.image} alt={member.user.name || member.user.id} />
              </ListItemAvatar>
              <ListItemText primary="User Info" secondary={member.user.name || member.user.id} />
            </ListItem>
            <ListItem>
              <ListItemText primary="Twitter" secondary={member.user.twitter || 'N/A'} />
              {member.user.twitter && (
                <IconButton component="a" href={`https://twitter.com/${member.user.twitter}`} target="_blank">
                  <FaTwitter />
                </IconButton>
              )}
            </ListItem>
            <ListItem>
              <ListItemText primary="LinkedIn" secondary={member.user.linkedin || 'N/A'} />
              {member.user.linkedin && (
                <IconButton component="a" href={`https://linkedin.com/in/${member.user.linkedin}`} target="_blank">
                  <FaLinkedin />
                </IconButton>
              )}
            </ListItem>
            <ListItem>
              <ListItemText primary="GitHub" secondary={member.user.github || 'N/A'} />
              {member.user.github && (
                <IconButton component="a" href={`https://github.com/${member.user.github}`} target="_blank">
                  <FaGithub />
                </IconButton>
              )}
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>
    );
  };

  useEffect(() => {
    const savedBackgroundUrl = localStorage.getItem('backgroundUrl');
    const savedLogoUrl = localStorage.getItem('logoUrl');
    if (savedBackgroundUrl) {
      setBackground(savedBackgroundUrl);
    }
    if (savedLogoUrl) {
      setLogoUrl(savedLogoUrl);
    }
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://js.stripe.com/v3/buy-button.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (isLoading) return <Loader />;
  if (error) return <p>{error}</p>;
  if (!activeChannel) return <p>No Channels Found. Create a new channel to start chatting.</p>;

  return (
    <Container style={{ backgroundImage: `url(${background})`, backgroundSize: 'cover', marginTop: '50px' }}>
      {showConfetti && <Confetti />}
      <motion.h1
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Chat Rooms
      </motion.h1>
      <div className="flex w-full max-w-7xl gap-4 h-full">
        <LiquidBox
          className="w-1/5 p-4"
        >
          <Typography variant="h6" gutterBottom>Channels</Typography>
          <List>
            {channels.map(channel => (
              <motion.li
                key={channel.id}
                className={`p-2 cursor-pointer ${activeChannel?.id === channel.id ? 'bg-gray-200' : ''}`}
                onClick={() => setActiveChannel(channel)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {channel.data?.name || channel.id}
              </motion.li>
            ))}
          </List>
          <GlassTextField
            label="New Channel Name"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <ShiftingButton onClick={handleCreateChannel} fullWidth>
            Create Channel
          </ShiftingButton>
          <div className="flex justify-around mt-4">
            <IconButton onClick={() => handleStartCall('audio_room')} style={{ color: 'white' }}>
              <FaPhone />
            </IconButton>
            <IconButton onClick={() => handleStartCall('video')} style={{ color: 'white' }}>
              <FaVideo />
            </IconButton>
            <IconButton onClick={handleInvite} style={{ color: 'white' }}>
              <FaUserPlus />
            </IconButton>
            <IconButton onClick={handleJoinChannel} style={{ color: 'white' }}>
              <FaLink />
            </IconButton>
            <IconButton onClick={() => setIsSubscriptionModalOpen(true)} style={{ color: 'white' }}>
              <FaCreditCard />
            </IconButton>
          </div>
          <div className="mt-4">
            <Typography variant="h6">Upcoming Calls</Typography>
            <CallList type="upcoming" />
          </div>
        </LiquidBox>
        <LiquidBox
        >
          <ChatContainer>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <IconButton onClick={() => handleStartCall('audio_room')} style={{ color: 'white' }}>
                  <FaPhone />
                </IconButton>
                <IconButton onClick={() => handleStartCall('video')} style={{ color: 'white' }}>
                  <FaVideo />
                </IconButton>
                <IconButton onClick={handleInvite} style={{ color: 'white' }}>
                  <FaUserPlus />
                </IconButton>
                <IconButton onClick={handleJoinChannel} style={{ color: 'white' }}>
                  <FaLink />
                </IconButton>
                <IconButton onClick={() => setIsSubscriptionModalOpen(true)} style={{ color: 'white' }}>
                  <FaCreditCard />
                </IconButton>
              </div>
            </div>
            <Chat client={client!} theme="messaging light">
              <StreamChannelComponent channel={activeChannel!}>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <div
                    className={`mt-4 p-4 rounded-b-lg ${css`
                      backdrop-filter: blur(10px);
                      background: rgba(255, 255, 255, 0.1);
                    `}`}
                  >
                    <MessageInput />
                  </div>
                  <Thread />
                </Window>
              </StreamChannelComponent>
            </Chat>
          </ChatContainer>
        </LiquidBox>
        <LiquidBox
        >
          <Typography variant="h6" gutterBottom>Members</Typography>
          <List>
            {members.map(member => (
              <motion.li
                key={member.user.id}
                className="flex items-center p-2 border-b cursor-pointer"
                onClick={() => handleMemberClick(member)}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: members.indexOf(member) * 0.1 }}
              >
                <ListItemAvatar>
                  <Avatar src={member.user.image} alt={member.user.name || member.user.id} />
                </ListItemAvatar>
                {member.user.name || member.user.id}
              </motion.li>
            ))}
          </List>
          <ShiftingButton onClick={() => setIsSettingsOpen(true)} fullWidth>
            Channel Settings
          </ShiftingButton>
          <div className="mt-4">
            <Canvas style={{ height: '200px', width: '200px' }}>
              <ambientLight />
              <pointLight position={[10, 10, 10]} />
              <OrbitControls />
              <CoinbaseLogo logoUrl={logoUrl || ''} />
            </Canvas>
            <Button variant="contained" component="label" fullWidth style={{ color: 'white', marginTop: '10px' }}>
              Change Logo
              <input
                type="file"
                hidden
                onChange={handleLogoChange}
                accept=".glb"
              />
            </Button>
          </div>
        </LiquidBox>
      </div>
      <div className="w-full mt-4">
        <Button variant="contained" component="label" fullWidth style={{ color: 'white' }}>
          Upload Background
          <input
            type="file"
            hidden
            onChange={handleBackgroundChange}
            accept="image/*"
          />
        </Button>
      </div>
      {selectedMember && <ProfileModal member={selectedMember} />}
      {isSettingsOpen && (
        <Dialog open={true} onClose={() => setIsSettingsOpen(false)}>
          <DialogTitle>
            Channel Settings
            <IconButton
              aria-label="close"
              onClick={() => setIsSettingsOpen(false)}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <ChannelSettings
              channel={activeChannel!}
              roles={roles}
              user={user}
              onChannelUpdated={setActiveChannel}
              onDeleteChannel={handleDeleteChannel}
            />
          </DialogContent>
        </Dialog>
      )}
      <Dialog open={isSubscriptionModalOpen} onClose={() => setIsSubscriptionModalOpen(false)}>
        <DialogTitle>Subscribe</DialogTitle>
        <DialogContent>
          <stripe-buy-button
            buy-button-id="buy_btn_1PYZFhFaK6jBdBSiwXgqn8BR"
            publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY}
          ></stripe-buy-button>
        </DialogContent>
      </Dialog>
      <Dialog open={isAiModalOpen} onClose={() => setIsAiModalOpen(false)}>
        <DialogTitle>AI Assistant</DialogTitle>
        <DialogContent>
          <TextField
            label="Enter your prompt"
            fullWidth
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            margin="normal"
          />
          <Button onClick={handleAiSubmit} variant="contained" color="primary" style={{ marginTop: '10px' }}>Submit</Button>
          {aiResponse && (
            <Typography variant="body1" style={{ marginTop: '10px' }}>
              {aiResponse}
            </Typography>
          )}
        </DialogContent>
      </Dialog>
      <BottomNav>
        <IconButton onClick={() => setIsAiModalOpen(true)} style={{ color: 'white' }}>
          <FaRobot />
        </IconButton>
        <IconButton onClick={() => router.push('/upcoming')} style={{ color: 'white' }}>
          <FaCalendar />
        </IconButton>
        <IconButton onClick={() => router.push('/Tasks')} style={{ color: 'white' }}>
          <FaTasks />
        </IconButton>
      </BottomNav>
    </Container>
  );
};

const CallList = ({ type }: { type: 'ended' | 'upcoming' | 'recordings' }) => {
  const router = useRouter();
  const { endedCalls, upcomingCalls, callRecordings, isLoading } = useGetCalls();
  const [recordings, setRecordings] = useState<CallRecording[]>([]);

  const getCalls = () => {
    switch (type) {
      case 'ended':
        return endedCalls;
      case 'recordings':
        return recordings;
      case 'upcoming':
        return upcomingCalls;
      default:
        return [];
    }
  };

  const getNoCallsMessage = () => {
    switch (type) {
      case 'ended':
        return 'No Previous Calls';
      case 'upcoming':
        return 'No Upcoming Calls';
      case 'recordings':
        return 'No Recordings';
      default:
        return '';
    }
  };

  useEffect(() => {
    const fetchRecordings = async () => {
      const callData = await Promise.all(
        callRecordings?.map((meeting: { queryRecordings: () => any; }) => meeting.queryRecordings()) ?? [],
      );

      const recordings = callData
        .filter((call) => call.recordings.length > 0)
        .flatMap((call) => call.recordings);

      setRecordings(recordings);
    };

    if (type === 'recordings') {
      fetchRecordings();
    }
  }, [type, callRecordings]);

  if (isLoading) return <Loader />;

  const calls = getCalls();
  const noCallsMessage = getNoCallsMessage();

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 w-full">
      {calls && calls.length > 0 ? (
        calls.map((meeting: Call | CallRecording) => (
          <MeetingCard
            key={(meeting as Call).id}
            icon={
              type === 'ended'
                ? '/icons/previous.svg'
                : type === 'upcoming'
                  ? '/icons/upcoming.svg'
                  : '/icons/recordings.svg'
            }
            title={
              (meeting as Call).state?.custom?.description ||
              (meeting as CallRecording).filename?.substring(0, 20) ||
              'No Description'
            }
            date={
              (meeting as Call).state?.startsAt?.toLocaleString() ||
              (meeting as CallRecording).start_time?.toLocaleString()
            }
            isPreviousMeeting={type === 'ended'}
            link={
              type === 'recordings'
                ? (meeting as CallRecording).url
                : `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${(meeting as Call).id}`
            }
            buttonIcon1={type === 'recordings' ? '/icons/play.svg' : undefined}
            buttonText={type === 'recordings' ? 'Play' : 'Start'}
            handleClick={
              type === 'recordings'
                ? () => router.push(`${(meeting as CallRecording).url}`)
                : () => router.push(`/meeting/${(meeting as Call).id}`)
            }
          />
        ))
      ) : (
        <h1 className="text-2xl font-bold text-white">{noCallsMessage}</h1>
      )}
    </div>
  );
};

const ChannelSettings: React.FC<{ channel: Channel; roles: Record<string, string>; user: any; onChannelUpdated: (channel: Channel) => void; onDeleteChannel: () => void }> = ({ channel, roles, user, onChannelUpdated, onDeleteChannel }) => {
  const [newChannelName, setNewChannelName] = useState(channel.data?.name || '');
  const [newProfileImage, setNewProfileImage] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, string>>(roles);

  useEffect(() => {
    const fetchMembers = async () => {
      const response = await channel.queryMembers({});
      setMembers(response.members);
    };

    fetchMembers();
  }, [channel]);

  const handleUpdateChannel = async () => {
    if (!channel) return;

    const updatedData: any = {};
    if (newChannelName) updatedData.name = newChannelName;
    if (newProfileImage) updatedData.image = newProfileImage;

    try {
      await channel.updatePartial({ set: updatedData });
      onChannelUpdated(channel);
    } catch (error) {
      console.error('Error updating channel:', error);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    setRolesMap((prevRoles) => ({
      ...prevRoles,
      [userId]: newRole,
    }));
  };

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <TextField
        label="Channel Name"
        value={newChannelName}
        onChange={(e) => setNewChannelName(e.target.value)}
        fullWidth
        margin="normal"
      />
      <List>
        {members.map(member => (
          <ListItem key={member.user.id}>
            <ListItemAvatar>
              <Avatar src={member.user.image} alt={member.user.name || member.user.id} />
            </ListItemAvatar>
            <ListItemText primary={member.user.name || member.user.id} />
            <TextField
              label="Role"
              value={rolesMap[member.user.id] || ''}
              onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
              fullWidth
              margin="normal"
            />
          </ListItem>
        ))}
      </List>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleUpdateChannel} style={{ color: 'black' }}>
          Save Changes
        </Button>
        <Button onClick={onDeleteChannel} style={{ color: 'red' }}>
          Delete Channel
        </Button>
      </div>
      <Button variant="contained" component="label" fullWidth style={{ color: 'white', marginTop: '10px' }}>
        Change Channel Avatar
        <input
          type="file"
          hidden
          onChange={handleProfileImageChange}
          accept="image/*"
        />
      </Button>
      <TextField
        label="Change Animation"
        select
        fullWidth
        margin="normal"
      >
        <MenuItem value="none">None</MenuItem>
        <MenuItem value="confetti">Confetti</MenuItem>
        <MenuItem value="fireworks">Fireworks</MenuItem>
        <MenuItem value="sparkles">Sparkles</MenuItem>
        <MenuItem value="balloons">Balloons</MenuItem>
        <MenuItem value="stars">Stars</MenuItem>
      </TextField>
    </div>
  );
};

export default PersonalRoom;
