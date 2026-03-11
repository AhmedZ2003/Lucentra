# Welcome to our Lucentra Project

## How to edit the code?

```sh
# For front-end, run the command in your git bash terminal
npm install
```

```sh
# For backend, download the requirements the given command in the terminal
pip install -r requirements.txt
```

## How to run the project?

In order to run this project, following these steps:

```sh
# Step 1: In your git bash terminal, type the following command to activate Front-end server
npm run dev

# Step 2: Then to run the backend server, run the command in your terminal to activate Backend server
python DPFlow/app.py
```


## How to use the app?

After both servers are active, Follow these steps:

For Driver:
- Navigate to the Lucentra website (through the local host) and create an account.
- Sign-in to your account and upload a dashcam footage (Make sure the format is in .mp4).
- After the video is processed, speed graphs along with the video processed will be displayed.

For FleetManager:
- Log-in to fleetmanager dashboard.
- A list of drivers be appear on the dashboard.
- Click on one of the drivers from the dashboard.
- The speed stats and processed video for that driver will be displayed on the speed dashboard.



## Main components of the project

The project revolves around two main components

Driver Dashboard:
This component allows drivers to upload their journey videos and analyze the vehicle’s speed data. The main features of the dashboard include:

- Upload Journey Videos: Drivers can upload videos of their trips. These videos are processed to extract the speed of the vehicle at each frame.

- Speed Analysis: Once the video is uploaded, the dashboard calculates the vehicle's speed at different frames throughout the journey. This data is displayed in a line graph, showing how the speed changes as the video plays.

- Statistics: The dashboard calculates key statistics, such as the average, maximum, and minimum speed from the uploaded video. This helps the driver understand their driving performance over the entire journey.


FleetManager Dashboard:
This component is designed for fleet managers to monitor and analyze the driving performance of drivers. Key features of the dashboard include:

- Driver Selection: Fleet managers can select a specific driver from the list, view their details, watch the journey video, and see the associated speed analysis.

- Driver Insights: Managers can access key insights and statistics for each driver, such as their average speed, maximum speed, and minimum speed throughout the journey.

- Speed Analysis: The dashboard provides a detailed breakdown of the vehicle’s speed at various points during the journey. It generates a speed graph that visually represents the vehicle's speed over time.
- 
- Video Playback: Fleet managers can watch the uploaded videos of each driver’s journey directly in the dashboard. This allows them to see how the vehicle performs in real-time.




## What technologies are used for this project?

This project is built with:

Frontend:
- Vite
- TypeScript
- React
- Tailwind CSS

Backend:
- Open CV
- PyTorch
- Timm
- Ptlflow
- Numpy

Models Used:
- DPFlow
- EfficientNetV2-tiny

Database used:
- Firestore
- Cloudinary