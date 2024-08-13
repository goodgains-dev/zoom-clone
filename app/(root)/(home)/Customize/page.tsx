"use client";

import React from 'react';
import { Button, Typography, Paper, Box, TextField, MenuItem } from '@mui/material';
import themes from '@/components/themes';
import { useSettings } from '@/components/SettingsProvider';

const CustomizePage = () => {
  const { updateSettings, layout, typography, primaryColor, chatAPI, database, aiModel, backgroundImage, logo, animation, theme } = useSettings();

  const handleThemeChange = (themeName) => {
    const selectedTheme = themes[themeName];
    updateSettings({
      theme: themeName,
      typography: selectedTheme.typography, // Update typography based on theme
      primaryColor: selectedTheme.primaryColor,
    });
  };

  const handleUpdateSetting = (key, value) => {
    updateSettings({ [key]: value });
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#fff' }}>
      <Typography variant="h4" gutterBottom>Customize Your Page</Typography>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {Object.entries(themes).map(([themeName, theme]) => (
          <Paper
            key={themeName}
            style={{
              width: '200px',
              height: '300px',
              padding: '20px',
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
              border: `2px solid ${theme.primaryColor}`,
              fontFamily: theme.typography.fontFamily, // Apply theme typography
            }}
          >
            <Typography variant="h6" style={{ fontFamily: theme.typography.fontFamily }}>
              {themeName}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                height: '100%',
              }}
            >
              <Box
                sx={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: theme.primaryColor,
                  borderRadius: '50%',
                }}
              />
              <Box
                sx={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: theme.secondaryColor,
                  borderRadius: '50%',
                }}
              />
              <Button
                variant="contained"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: theme.textColor,
                }}
                onClick={() => handleThemeChange(themeName)}
              >
                Apply
              </Button>
            </Box>
          </Paper>
        ))}
      </div>

      <TextField
        label="Layout"
        select
        value={layout}
        onChange={(e) => handleUpdateSetting('layout', e.target.value)}
        fullWidth
        margin="normal"
      >
        <MenuItem value="default">Default</MenuItem>
        <MenuItem value="compact">Compact</MenuItem>
        <MenuItem value="spacious">Spacious</MenuItem>
      </TextField>

      <TextField
        label="Typography Font Family"
        select
        value={typography.fontFamily}
        onChange={(e) => handleUpdateSetting('typography', { ...typography, fontFamily: e.target.value })}
        fullWidth
        margin="normal"
      >
        <MenuItem value="Roboto">Roboto</MenuItem>
        <MenuItem value="Arial">Arial</MenuItem>
        <MenuItem value="Times New Roman">Times New Roman</MenuItem>
        <MenuItem value="'Press Start 2P', cursive">Press Start 2P, cursive</MenuItem>
        <MenuItem value="'Comic Sans MS', cursive">Comic Sans MS, cursive</MenuItem>
        <MenuItem value="'Lobster', cursive">Lobster, cursive</MenuItem>
      </TextField>

      <TextField
        label="Typography Font Size"
        value={typography.fontSize}
        onChange={(e) => handleUpdateSetting('typography', { ...typography, fontSize: e.target.value })}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Primary Color"
        value={primaryColor}
        onChange={(e) => handleUpdateSetting('primaryColor', e.target.value)}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Chat API"
        select
        value={chatAPI}
        onChange={(e) => handleUpdateSetting('chatAPI', e.target.value)}
        fullWidth
        margin="normal"
      >
        <MenuItem value="telegram">Telegram</MenuItem>
        <MenuItem value="stream">Stream</MenuItem>
        <MenuItem value="sendbird">SendBird</MenuItem>
      </TextField>

      <TextField
        label="Database"
        select
        value={database}
        onChange={(e) => handleUpdateSetting('database', e.target.value)}
        fullWidth
        margin="normal"
      >
        <MenuItem value="ipfs">IPFS</MenuItem>
        <MenuItem value="wasabi">Wasabi</MenuItem>
        <MenuItem value="neon">Neon</MenuItem>
      </TextField>

      <TextField
        label="AI Model"
        select
        value={aiModel}
        onChange={(e) => handleUpdateSetting('aiModel', e.target.value)}
        fullWidth
        margin="normal"
      >
        <MenuItem value="LLama">LLama</MenuItem>
        <MenuItem value="OpenAI">OpenAI</MenuItem>
        <MenuItem value="None">None</MenuItem>
      </TextField>

      <TextField
        label="Background Image URL"
        value={backgroundImage}
        onChange={(e) => handleUpdateSetting('backgroundImage', e.target.value)}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Logo Image URL"
        value={logo}
        onChange={(e) => handleUpdateSetting('logo', e.target.value)}
        fullWidth
        margin="normal"
      />

      <TextField
        label="Animation"
        select
        value={animation}
        onChange={(e) => handleUpdateSetting('animation', e.target.value)}
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

export default CustomizePage;
