
# Introduction / Summary

The In World Poll App allows admins to create a poll by configuring a question and up to 5 answer options. Users can then vote for their preferred option and view the poll results once they've cast their vote. Results are displayed based on a configuration that shows either the percentage or the total number of votes for each answer.

## Key Features

### Canvas elements & interactions

- **Key Asset:** When clicked, this asset opens the app in the drawer and allows both admins and users to interact with the poll.

### Drawer content

- **User View:**
  - Main page with a placeholder text if no poll is configured.
  - Displays the poll title, question, and available answers.
  - Allows users to cast a single vote and view poll results (either as percentages or vote counts based on admin configuration).

- **Admin View:**
  - Accessible via a settings icon on the main page.
  - Contains poll configuration options and admin-specific interactions (see below).

### Admin features

- **Access:**
  - When the admin clicks on the key asset, the app opens in the drawer.
  - A settings icon on the main page leads to the admin page.
- **Poll Configuration:**
  - **Question Entry:** Admin can enter the poll question.
  - **Answer Options:**
    - Admin can provide between 2 to 5 answer options.
    - Five text fields are provided; only fields with input values are dynamically rendered for users.
  - **Display Mode:**
    - Admin selects whether poll results are displayed as a percentage or as a number of votes via radio buttons
    - Options:
      - Percentage
      - Number of Votes
  - **Save Button:**
    - Clicking on the Save button updates the app with the current poll filled out in the admin form page and deletes any existing data in the assets data object
  - **Reset Button:**
    - Clicking on the Reset button clears the current poll and all the saved data in the assets data object

### Data objects

- Key Asset: the data object attached to the dropped key asset will store information related to this specific implementation of the app and would be deleted if the key asset is removed from world. Example data:
  - question: string;
  - answers: string[];
  - displayMode: "percentage" | "count";
  - options?: { [key: string]: { votes: number } };
  - results?: { [profileId: string]: { answer: number } };

## Developers

### Built With

#### Client

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

#### Server

![Node.js](https://img.shields.io/badge/node.js-%2343853D.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/express-%23000000.svg?style=for-the-badge&logo=express&logoColor=white)

### Getting Started

- Clone this repository
- Run `npm i` in server
- `cd client`
- Run `npm i` in client
- `cd ..` back to server

### Add your .env environmental variables

```json
API_KEY=xxxxxxxxxxxxx
INSTANCE_DOMAIN=api.topia.io
INSTANCE_PROTOCOL=https
INTERACTIVE_KEY=xxxxxxxxxxxxx
INTERACTIVE_SECRET=xxxxxxxxxxxxxx
```

### Where to find API_KEY, INTERACTIVE_KEY and INTERACTIVE_SECRET

[Topia Dev Account Dashboard](https://dev.topia.io/t/dashboard/integrations)

[Topia Production Account Dashboard](https://topia.io/t/dashboard/integrations)

### Helpful links

- [SDK Developer docs](https://metaversecloud-com.github.io/mc-sdk-js/index.html)
- [View it in action!](topia.io/appname-prod)
- To see an example of an on canvas turn based game check out TicTacToe:
  - (github))[https://github.com/metaversecloud-com/sdk-tictactoe]
  - (demo))[https://topia.io/tictactoe-prod]
