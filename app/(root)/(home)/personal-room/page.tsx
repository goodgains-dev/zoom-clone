'use client';

import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { useUser } from '@clerk/nextjs';
import { StreamChat, Channel, ChannelFilters, ChannelSort, DefaultGenerics } from 'stream-chat';
import {
  Chat,
  Channel as StreamChannelComponent,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
  MessageSimple
} from 'stream-chat-react';
import { StreamVideoClient, ParticipantView, StreamVideoParticipant } from '@stream-io/video-react-sdk';
import { motion } from 'framer-motion';
import { useReactMediaRecorder } from 'react-media-recorder';
import Loader from '@/components/Loader'; // Ensure this path is correct
import { tokenProvider } from '@/actions/stream.actions'; // Ensure this path is correct
import { Button } from '@/components/ui/button'; // Ensure this path is correct
import { useToast } from '@/components/ui/use-toast'; // Ensure this path is correct
import 'stream-chat-react/dist/css/index.css'; // Ensure Stream's CSS is loaded
import { FaTwitter, FaLinkedin, FaGithub } from 'react-icons/fa';

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

const Container = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  animation: ${colorShift} 10s infinite alternate;
  text-align: black;
`;

interface ChannelSettingsProps {
  channel: Channel<DefaultGenerics>;
  roles: Record<string, string>;
  user: any;
  onChannelUpdated: (channel: Channel<DefaultGenerics>) => void;
  onDeleteChannel: () => void;
}

const ChannelSettings: React.FC<ChannelSettingsProps> = ({ channel, roles, user, onChannelUpdated, onDeleteChannel }) => {
  const [newChannelName, setNewChannelName] = useState('');
  const { toast } = useToast();
  const [memberRoles, setMemberRoles] = useState(roles);

  const handleNameChange = async () => {
    if (!newChannelName) return;

    try {
      await channel.updatePartial({
        set: {
          name: newChannelName,
        },
      });
      onChannelUpdated(channel);
      toast({ title: 'Success', description: 'Channel name updated successfully' });
    } catch (error) {
      console.error('Error updating channel name:', error);
      toast({ title: 'Error', description: 'Failed to update channel name' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await channel.updatePartial({
        set: { [`members.${userId}.role`]: newRole },
      });
      setMemberRoles({ ...memberRoles, [userId]: newRole });
      toast({ title: 'Success', description: 'User role updated successfully' });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({ title: 'Error', description: 'Failed to update user role' });
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Channel Settings</h2>
      <div className="mb-4">
        <label className="block mb-2">Change Channel Name</label>
        <input
          type="text"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          placeholder="New channel name"
          className="w-full p-2 mb-2 border rounded"
        />
        <Button onClick={handleNameChange} className="w-full">Change Name</Button>
      </div>
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2">Set Member Roles</h3>
        <ul>
          {Object.entries(memberRoles).map(([userId, role]) => (
            <li key={userId} className="flex items-center justify-between p-2 border-b">
              <span>{userId}</span>
              <select
                value={role}
                onChange={(e) => handleRoleChange(userId, e.target.value)}
                className="p-2 border rounded"
              >
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            </li>
          ))}
        </ul>
      </div>
      <Button onClick={onDeleteChannel} className="w-full bg-red-500 text-white">Delete Channel</Button>
    </div>
  );
};

const PersonalRoom: React.FC = () => {
  const { user, isLoaded } = useUser();
  const [client, setClient] = useState<StreamChat<DefaultGenerics> | null>(null);
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [channels, setChannels] = useState<Channel<DefaultGenerics>[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel<DefaultGenerics> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const { toast } = useToast();
  const [inviteUserId, setInviteUserId] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [roles, setRoles] = useState<Record<string, string>>({}); // Store user roles
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Manage settings modal state
  const [participants, setParticipants] = useState<StreamVideoParticipant[]>([]); // Store call participants

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { startRecording, stopRecording, mediaBlobUrl, clearBlobUrl } = useReactMediaRecorder({ audio: true });

  useEffect(() => {
    if (!user || !isLoaded) return;

    const initChat = async () => {
      try {
        const streamClient = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY!);
        const token = await tokenProvider(); // Assuming tokenProvider does not require any arguments

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
          // Fetch roles for the members
          const membersWithRoles = await fetchedChannels[0].queryMembers({});
          const rolesMap: Record<string, string> = {};
          membersWithRoles.members.forEach(member => {
            if (member.user_id) {
              rolesMap[member.user_id] = member.role!;
            }
          });
          setRoles(rolesMap);
        }

        setClient(streamClient);

        // Initialize Stream Video Client
        const videoClient = new StreamVideoClient({
          apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
          user: {
            id: user.id,
            name: user.username || user.id,
          },
          token,
        });
        setVideoClient(videoClient);
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
      if (videoClient) {
        videoClient.disconnectUser();
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

  const handleStartCall = async () => {
    if (!videoClient || !activeChannel) {
      toast({ title: 'Error', description: 'Cannot start call. Video client or channel is missing.' });
      return;
    }

    try {
      const call = await videoClient.call(`call-${activeChannel.id}`, Object.keys(activeChannel.state.members)[0]);
      setIsCallActive(true);
      call.join();

      // Fetch participants and set them in state
      const Participants = participants; // Access participants using the 'participants' property
      setParticipants(Participants);
    } catch (error) {
      console.error('Error starting call:', error);
      toast({ title: 'Error', description: 'Failed to start call' });
    }
  };

  const handleSendVoiceMessage = async () => {
    if (mediaBlobUrl && activeChannel) {
      try {
        const response = await fetch(mediaBlobUrl);
        const blob = await response.blob();
        const file = new File([blob], "voice-message.wav", { type: blob.type });

        await activeChannel.sendMessage({
          attachments: [
            {
              file,
              type: 'audio',
            },
          ],
          text: 'Voice message',
        });

        clearBlobUrl();
      } catch (error) {
        console.error('Error sending voice message:', error);
        toast({ title: 'Error', description: 'Failed to send voice message' });
      }
    }
  };

  const handlePlayPauseAudio = async (url: string) => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setPlayingAudioUrl(null);
      }

      if (playingAudioUrl === url) {
        if (audioRef.current.paused) {
          await audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      } else {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        audioRef.current.src = url;
        await audioRef.current.play();
        setPlayingAudioUrl(url);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const customMessageRenderer = (messageProps: any) => {
    const { message } = messageProps;
    if (message && message.attachments && message.attachments.length > 0 && message.attachments[0].type === 'audio') {
      return (
        <div className="custom-message">
          <p>{message.text}</p>
          <Button onClick={() => handlePlayPauseAudio(message.attachments[0].asset_url)}>Play/Pause Audio</Button>
        </div>
      );
    }
    return <MessageSimple {...messageProps} />;
  };

  const handleMemberClick = (member: any) => {
    setSelectedMember(member);
  };

  const handleCloseProfileModal = () => {
    setSelectedMember(null);
  };

  const ProfileModal: React.FC<{ member: any }> = ({ member }) => {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg relative">
          <button className="absolute top-0 right-0 p-2" onClick={handleCloseProfileModal}>X</button>
          <div className="flex flex-col items-center">
            <img src={member.user.image} alt={member.user.name || member.user.id} className="w-24 h-24 rounded-full mb-4" />
            <h2 className="text-2xl font-bold">{member.user.name || member.user.id}</h2>
            <div className="flex gap-4 mt-4">
              {member.user.twitter && (
                <a href={`https://twitter.com/${member.user.twitter}`} target="_blank" rel="noopener noreferrer">
                  <FaTwitter size={24} />
                </a>
              )}
              {member.user.linkedin && (
                <a href={`https://linkedin.com/in/${member.user.linkedin}`} target="_blank" rel="noopener noreferrer">
                  <FaLinkedin size={24} />
                </a>
              )}
              {member.user.github && (
                <a href={`https://github.com/${member.user.github}`} target="_blank" rel="noopener noreferrer">
                  <FaGithub size={24} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <Loader />;
  if (error) return <p>{error}</p>;
  if (!activeChannel) return <p>No Channels Found. Create a new channel to start chatting.</p>;

  return (
    <Container>
      <motion.h1
        className="text-3xl font-bold mb-6"
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Chat Rooms
      </motion.h1>
      <div className="flex w-full max-w-7xl gap-4">
        <motion.div
          className="w-1/5 p-4 bg-white rounded-lg shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-bold mb-4">Channels</h2>
          <ul className="mb-4">
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
          </ul>
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="New channel name"
            className="w-full p-2 mb-2 border rounded"
          />
          <Button onClick={handleCreateChannel} className="w-full">Create Channel</Button>
        </motion.div>
        <motion.div
          className="w-3/5 p-4 bg-white rounded-lg shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Chat client={client!} theme="messaging light">
            <StreamChannelComponent channel={activeChannel!} Message={customMessageRenderer}>
              <Window>
                <ChannelHeader />
                <MessageList />
                <div className="mt-4 p-4 bg-gray-200 rounded-b-lg">
                  <MessageInput />
                </div>
                <Thread />
              </Window>
            </StreamChannelComponent>
          </Chat>
          <div className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              placeholder="Enter user ID to invite"
              className="p-2 border rounded"
            />
            <Button onClick={handleInvite}>Invite</Button>
            <Button onClick={handleInvite}>Copy Invite Link</Button>
          </div>
          <motion.div
            className="mt-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Button onClick={handleStartCall}>Start Call</Button>
            {isCallActive && participants.map(participant => (
              <ParticipantView key={participant.userId} participant={participant} />
            ))}
          </motion.div>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={startRecording}>Start Recording</Button>
            <Button onClick={stopRecording}>Stop Recording</Button>
            {mediaBlobUrl && (
              <div className="flex items-center gap-2">
                <Button onClick={handleSendVoiceMessage}>Send Voice Message</Button>
                <Button onClick={() => handlePlayPauseAudio(mediaBlobUrl)}>Play/Pause</Button>
                <audio ref={audioRef} />
              </div>
            )}
          </div>
        </motion.div>
        <motion.div
          className="w-1/5 p-4 bg-white rounded-lg shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-bold mb-4">Members</h2>
          <ul>
            {members.map(member => (
              <motion.li
                key={member.user.id}
                className="flex items-center p-2 border-b cursor-pointer"
                onClick={() => handleMemberClick(member)}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: members.indexOf(member) * 0.1 }}
              >
                <img src={member.user.image} alt={member.user.name || member.user.id} className="w-8 h-8 rounded-full mr-2" />
                {member.user.name || member.user.id}
              </motion.li>
            ))}
          </ul>
          <Button onClick={() => setIsSettingsOpen(true)} className="w-full mt-4">Channel Settings</Button>
        </motion.div>
      </div>
      {selectedMember && <ProfileModal member={selectedMember} />}
      {isSettingsOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg relative">
            <button className="absolute top-0 right-0 p-2" onClick={() => setIsSettingsOpen(false)}>X</button>
            <ChannelSettings
              channel={activeChannel!}
              roles={roles}
              user={user}
              onChannelUpdated={setActiveChannel}
              onDeleteChannel={handleDeleteChannel}
            />
          </div>
        </div>
      )}
    </Container>
  );
};

export default PersonalRoom
