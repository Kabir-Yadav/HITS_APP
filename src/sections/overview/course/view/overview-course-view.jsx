import { varAlpha } from 'minimal-shared/utils';
import React, { useState, useEffect } from 'react';

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  Stack,
  Divider,
  Paper,
  Zoom,
} from '@mui/material';
import {
  Search as SearchIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  Fullscreen as FullscreenIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeOffIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Videocam as VideocamIcon,
  Close as CloseIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

import { DashboardContent } from 'src/layouts/dashboard';

// Mock data for cameras
const generateMockCameras = (count = 50) => {
  const areas = [
    'Production Floor',
    'Warehouse',
    'Office',
    'Parking',
    'Security Gate',
    'Quality Control',
    'Maintenance',
  ];
  const statuses = ['online', 'offline', 'maintenance', 'warning'];

  return Array.from({ length: count }, (_, i) => ({
    id: `cam-${i + 1}`,
    name: `Camera ${i + 1}`,
    area: areas[Math.floor(Math.random() * areas.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    resolution: ['1080p', '4K', '720p'][Math.floor(Math.random() * 3)],
    lastSeen: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
    thumbnail: `https://picsum.photos/320/240?random=${i}`,
    isRecording: Math.random() > 0.3,
    hasMotion: Math.random() > 0.7,
  }));
};

const CameraCard = ({ camera, onFullscreen, viewMode }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'maintenance':
        return 'warning';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon fontSize="small" />;
      case 'offline':
        return <ErrorIcon fontSize="small" />;
      case 'maintenance':
        return <SettingsIcon fontSize="small" />;
      case 'warning':
        return <WarningIcon fontSize="small" />;
      default:
        return <VideocamIcon fontSize="small" />;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
        border: camera.hasMotion ? '2px solid #ff9800' : 'none',
      }}
    >
      <Box sx={{ position: 'relative', paddingTop: '56.25%', bgcolor: 'grey.100' }}>
        {/* Camera Feed Placeholder */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${camera.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {camera.status === 'offline' && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h6" color="white">
                Camera Offline
              </Typography>
            </Box>
          )}

          {/* Status Badge */}
          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
            <Chip
              icon={getStatusIcon(camera.status)}
              label={camera.status.toUpperCase()}
              size="small"
              color={getStatusColor(camera.status)}
              sx={{ textTransform: 'capitalize' }}
            />
          </Box>

          {/* Recording Indicator */}
          {camera.isRecording && (
            <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
              <Badge color="error" variant="dot" overlap="circular">
                <Chip
                  label="REC"
                  size="small"
                  sx={{
                    bgcolor: 'error.main',
                    color: 'white',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              </Badge>
            </Box>
          )}

          {/* Motion Detection */}
          {camera.hasMotion && (
            <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
              <Chip
                label="MOTION"
                size="small"
                sx={{
                  bgcolor: 'warning.main',
                  color: 'white',
                  animation: 'pulse 1s infinite',
                }}
              />
            </Box>
          )}

          {/* Control Overlay */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              opacity: 0,
              transition: 'opacity 0.3s ease',
              '&:hover': { opacity: 1 },
            }}
            className="camera-controls"
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => setIsPlaying(!isPlaying)}
                sx={{ color: 'white' }}
              >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
              <IconButton size="small" onClick={() => setIsMuted(!isMuted)} sx={{ color: 'white' }}>
                {isMuted ? <VolumeOffIcon /> : <VolumeIcon />}
              </IconButton>
            </Box>
            <IconButton size="small" onClick={() => onFullscreen(camera)} sx={{ color: 'white' }}>
              <FullscreenIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {viewMode === 'detailed' && (
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 1,
            }}
          >
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              {camera.name}
            </Typography>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {camera.area}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={camera.resolution} size="small" variant="outlined" />
            <Chip label={`Last seen: ${camera.lastSeen}`} size="small" variant="outlined" />
          </Box>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => setAnchorEl(null)}>Configure</MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>View History</MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>Download</MenuItem>
          </Menu>
        </CardContent>
      )}
    </Card>
  );
};

export function CCTVView() {
  const [cameras, setCameras] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [gridSize, setGridSize] = useState(4);
  const [selectedArea, setSelectedArea] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setCameras(generateMockCameras(50));
  }, []);

  const filteredCameras = cameras.filter((camera) => {
    const matchesSearch =
      camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.area.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedArea === 'all' || camera.area === selectedArea;
    const matchesStatus = statusFilter === 'all' || camera.status === statusFilter;

    return matchesSearch && matchesArea && matchesStatus;
  });

  const areas = [...new Set(cameras.map((camera) => camera.area))];
  const statuses = [...new Set(cameras.map((camera) => camera.status))];

  const getGridColumns = () => {
    switch (gridSize) {
      case 1:
        return 12;
      case 2:
        return 6;
      case 3:
        return 4;
      case 4:
        return 3;
      case 6:
        return 2;
      default:
        return 3;
    }
  };

  const statusCounts = cameras.reduce((acc, camera) => {
    acc[camera.status] = (acc[camera.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardContent
      maxWidth={false}
      disablePadding
      sx={[
        (theme) => ({
          borderTop: { lg: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}` },
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }),
      ]}
    >
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderBottom: (theme) =>
            `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            CCTV Monitoring
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="Search cameras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <IconButton onClick={() => setShowFilters(!showFilters)}>
              <FilterIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Chip label={`Total: ${cameras.length}`} color="primary" variant="outlined" />
          <Chip label={`Online: ${statusCounts.online || 0}`} color="success" variant="outlined" />
          <Chip label={`Offline: ${statusCounts.offline || 0}`} color="error" variant="outlined" />
          <Chip
            label={`Maintenance: ${statusCounts.maintenance || 0}`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Recording: ${cameras.filter((c) => c.isRecording).length}`}
            color="info"
            variant="outlined"
          />
        </Box>

        {/* Filters */}
        <Zoom in={showFilters}>
          <Box sx={{ display: showFilters ? 'flex' : 'none', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Area</InputLabel>
              <Select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                label="Area"
              >
                <MenuItem value="all">All Areas</MenuItem>
                {areas.map((area) => (
                  <MenuItem key={area} value={area}>
                    {area}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem />

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="grid">
                <GridViewIcon />
              </ToggleButton>
              <ToggleButton value="detailed">
                <ViewListIcon />
              </ToggleButton>
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Grid Size</InputLabel>
              <Select
                value={gridSize}
                onChange={(e) => setGridSize(e.target.value)}
                label="Grid Size"
              >
                <MenuItem value={1}>1 Column</MenuItem>
                <MenuItem value={2}>2 Columns</MenuItem>
                <MenuItem value={3}>3 Columns</MenuItem>
                <MenuItem value={4}>4 Columns</MenuItem>
                <MenuItem value={6}>6 Columns</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Zoom>
      </Paper>

      {/* Camera Grid */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Grid container spacing={3}>
          {filteredCameras.map((camera) => (
            <Grid item xs={12} sm={6} md={getGridColumns()} key={camera.id}>
              <CameraCard camera={camera} onFullscreen={setFullscreenCamera} viewMode={viewMode} />
            </Grid>
          ))}
        </Grid>

        {filteredCameras.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <VideocamIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No cameras found matching your criteria
            </Typography>
          </Box>
        )}
      </Box>

      {/* Fullscreen Dialog */}
      <Dialog
        open={Boolean(fullscreenCamera)}
        onClose={() => setFullscreenCamera(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' },
        }}
      >
        {fullscreenCamera && (
          <>
            <DialogTitle
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="h6">{fullscreenCamera.name}</Typography>
              <IconButton onClick={() => setFullscreenCamera(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${fullscreenCamera.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {fullscreenCamera.status === 'offline' && (
                  <Typography
                    variant="h4"
                    color="white"
                    sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                  >
                    Camera Offline
                  </Typography>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Global Styles */}
      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }

        .camera-controls {
          opacity: 0 !important;
        }

        .MuiCard-root:hover .camera-controls {
          opacity: 1 !important;
        }
      `}</style>
    </DashboardContent>
  );
}
