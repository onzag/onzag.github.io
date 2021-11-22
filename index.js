const hornElem = document.querySelector("#horn");

function playHornStandard() {
    hornElem.play();

    setTimeout(() => {
        hornElem.play();
    }, 3000);
}

const allPlayersInit = JSON.parse(localStorage.getItem("PLAYERS") || "[]");
const playerTeamAssignment = {};

function escapeHtml(unsafe) {
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function addPlayer(playerName, force) {
    if (!playerName) {
        return;
    }

    const alreadyExists = allPlayersInit.findIndex((n) => n.toLowerCase() === playerName.toLowerCase()) !== -1;
    if (alreadyExists && !force) {
        document.querySelector("#alert-player-exists").classList.remove("invisible");

        setTimeout(() => {
            document.querySelector("#alert-player-exists").classList.add("invisible");
        }, 3000);
        return;
    }

    if (!alreadyExists) {
        allPlayersInit.push(playerName);
        localStorage.setItem("PLAYERS", JSON.stringify(allPlayersInit));
    }

    const liItem = document.createElement("li");
    liItem.id = "PLAYER" + escapeHtml(playerName.replaceAll(" ", "_"));
    liItem.className = "user-select-none list-group-item list-group-item-light list-group-item-action d-flex justify-content-between align-items-start";
    liItem.innerHTML = `<div class="ms-2 me-auto">` +
        `<div class="fw-bold">${escapeHtml(playerName)}</div><span class="team">no team</span></div>` +
        `<span class="badge bg-danger rounded-pill delete-player" style="cursor:pointer">x</span>`

    document.querySelector("#player-list").appendChild(liItem);

    liItem.querySelector(".delete-player").addEventListener("click", deletePlayer.bind(null, playerName))

    liItem.addEventListener("click", cyclePlayerTeam.bind(null, playerName));
}

function deletePlayer(playerName, e) {
    e.stopPropagation();
    e.preventDefault();

    const index = allPlayersInit.findIndex((n) => n.toLowerCase() === playerName.toLowerCase());
    if (index !== -1) {
        allPlayersInit.splice(index, 1);
        localStorage.setItem("PLAYERS", JSON.stringify(allPlayersInit));

        const selector = "#PLAYER" + escapeHtml(playerName.replaceAll(" ", "_"));
        const liItem = document.querySelector(selector);

        liItem.parentElement.removeChild(liItem);
    }
}

const availableTeams = [
    "red",
    "green",
    "blue",
];

const classesTeam = {
    "red": "list-group-item-danger",
    "green": "list-group-item-success",
    "blue": "list-group-item-primary",
    "null": "list-group-item-light",
}

function cyclePlayerTeam(playerName) {
    let originalTeam = playerTeamAssignment[playerName] || null;
    let newTeam = null;
    if (!playerTeamAssignment[playerName]) {
        playerTeamAssignment[playerName] = availableTeams[0];
        newTeam = availableTeams[0];
    } else {
        let index = availableTeams.indexOf(playerTeamAssignment[playerName]);
        index++;

        if (index >= availableTeams.length) {
            delete playerTeamAssignment[playerName];
            newTeam = null;
        } else {
            playerTeamAssignment[playerName] = availableTeams[index];
            newTeam = availableTeams[index];
        }
    }

    const selector = "#PLAYER" + escapeHtml(playerName.replaceAll(" ", "_"));
    document.querySelector(selector).querySelector(".team").textContent = newTeam === null ? "no team" : newTeam;

    document.querySelector(selector).classList.remove(classesTeam[originalTeam]);
    document.querySelector(selector).classList.add(classesTeam[newTeam]);

    calculateViability();
}

function hideWarnings() {
    document.querySelector("#alert-full-balance").classList.add("d-none");
    document.querySelector("#alert-simple-swap-mode").classList.add("d-none");
    document.querySelector("#alert-team-swap-mode").classList.add("d-none");
    document.querySelector("#alert-team-swap-mode-with-rotations").classList.add("d-none");
    document.querySelector("#alert-7-people-team").classList.add("d-none");
    document.querySelector("#alert-unbalance").classList.add("d-none");
}

let teamCount = {};
function calculateViability() {
    hideWarnings();

    teamCount = {};
    Object.keys(playerTeamAssignment).forEach((player) => {
        teamCount[playerTeamAssignment[player]] = teamCount[playerTeamAssignment[player]] || [];
        teamCount[playerTeamAssignment[player]].push(player);
    });

    let viable = true;
    let min = null;
    let max = null;
    Object.keys(teamCount).forEach((team) => {
        if (teamCount[team].length >= 7) {
            document.querySelector("#alert-7-people-team").classList.remove("d-none");
            viable = false;
        }

        if (min === null || teamCount[team].length < min) {
            min = teamCount[team].length;
        }

        if (max === null || teamCount[team].length > max) {
            max = teamCount[team].length;
        }
    });

    let unbalance = false;
    if (min !== null && max !== null) {
        if (max - min >= 2) {
            unbalance = true;
            document.querySelector("#alert-unbalance").classList.remove("d-none");
        }
    }

    const teamsAll4OrLess = Object.keys(teamCount).every((team) => {
        return (teamCount[team].length <= 4);
    });

    const teamWithMoreThan4 = Object.keys(teamCount).every((team) => {
        return (teamCount[team].length > 4);
    });

    if (Object.keys(teamCount).length <= 1) {
        viable = false;
    } else if (Object.keys(teamCount).length === 2) {
        if (teamsAll4OrLess && !unbalance) {
            viable = false;
            document.querySelector("#alert-full-balance").classList.remove("d-none");
        } else if (!unbalance) {
            document.querySelector("#alert-simple-swap-mode").classList.remove("d-none");
        }
    } else if (Object.keys(teamCount).length > 2) {
        if (teamWithMoreThan4 && !unbalance) {
            document.querySelector("#alert-team-swap-mode-with-rotations").classList.remove("d-none");
        } else if (!unbalance) {
            document.querySelector("#alert-team-swap-mode").classList.remove("d-none");
        }
    }

    if (viable) {
        document.querySelector("#start-game-button").removeAttribute("disabled");
    } else {
        document.querySelector("#start-game-button").setAttribute("disabled", "disabled");
    }
}

allPlayersInit.forEach((p) => {
    addPlayer(p, true)
});

document.querySelector("#add-player-button").addEventListener("click", () => {
    const input = document.querySelector("#new-player-input");
    const newPlayerName = input.value;
    input.value = "";

    addPlayer(newPlayerName);
});

document.querySelector("#start-game-button").addEventListener("click", () => {
    startGame();
});

let time = 11;
async function doTickDown() {
    time--;
    document.querySelector("#timer").textContent = fancyTimeFormat(time);
    if (time === 0) {
        return;
    } else {
        return new Promise((resolve) => {
            setTimeout(async () => {
                await doTickDown();
                resolve();
            }, 1000);
        })
    }
}
async function tickDown() {
    document.querySelector("#timer").classList.remove("round-count");
    playHornStandard();
    time = 21;
    await doTickDown();
}
async function tickDownExtraTime() {
    document.querySelector("#timer").classList.remove("round-count");
    playHornStandard();
    time = 61;
    // time = 21;
    await doTickDown();
}
async function tickDownRound() {
    document.querySelector("#timer").classList.add("round-count");
    hornElem.play();
    time = (60 * 5) + 1;
    // time = 21;
    await doTickDown();
}

function fancyTimeFormat(duration)
{   
    // Hours, minutes and seconds
    var hrs = ~~(duration / 3600);
    var mins = ~~((duration % 3600) / 60);
    var secs = ~~duration % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

let activeTeamA = null;
let activeTeamAWhole = null;
let activeTeamAShape = null;
let activeTeamB = null;
let activeTeamBShape = null;
let activeTeamBWhole = null;
let nextTeamInLine = null;
let rotationIndex = null;
let teamRotationIndex = null;
let allTeams = null;
function startGame() {
    allTeams = Object.keys(teamCount);
    teamRotationIndex = -1;
    rotationIndex = {};
    allTeams.forEach((t) => {
        rotationIndex[t] = -1;
    });

    document.querySelector("#app").classList.add("d-none");
    document.querySelector("#game").classList.remove("d-none");

    cycleTeams(true);
}

async function cycleTeams(extraTime) {
    teamRotationIndex++;

    if (allTeams.length === 2) {
        // team rotations are irrelevant
        activeTeamA = allTeams[0];
        activeTeamB = allTeams[1];
    } else {
        activeTeamA = allTeams[teamRotationIndex % allTeams.length];
        activeTeamB = allTeams[(teamRotationIndex + 1) % allTeams.length];
    }
    
    rotationIndex[activeTeamA]++;
    rotationIndex[activeTeamB]++;

    activeTeamAWhole = teamCount[activeTeamA];
    activeTeamBWhole = teamCount[activeTeamB];

    if (activeTeamAWhole.length <= 4) {
        activeTeamAShape = activeTeamAWhole;
    } else {
        activeTeamAShape = [];
        for (let i = 0; i < 4; i++) {
            activeTeamAShape.push(activeTeamAWhole[(i + rotationIndex[activeTeamA]) % activeTeamAWhole.length])
        }
    }

    if (activeTeamBWhole.length <= 4) {
        activeTeamBShape = activeTeamBWhole;
    } else {
        activeTeamBShape = [];
        for (let i = 0; i < 4; i++) {
            activeTeamBShape.push(activeTeamBWhole[(i + rotationIndex[activeTeamB]) % activeTeamBWhole.length])
        }
    }

    document.querySelector("#team-a").innerHTML = "";
    document.querySelector("#team-b").innerHTML = "";
    document.querySelector("#vs-map").classList.remove("d-none");

    [activeTeamAWhole, activeTeamBWhole].forEach((activeTeam, index) => {
        const isB = index === 1;

        activeTeam.forEach((player) => {
            const isPlaying = [activeTeamAShape, activeTeamBShape][index].includes(player);
            const liItem = document.createElement("li");
            liItem.className = "user-select-none list-group-item list-group-item-action d-flex justify-content-between align-items-start " +
                (isPlaying ? classesTeam[[activeTeamA, activeTeamB][index]] : "");
            liItem.innerHTML = `<div class="ms-2 me-auto">` +
                `<div class="fw-bold">${escapeHtml(player)}</div><span class="team">${[activeTeamA, activeTeamB][index]}</span></div>`
    
            document.querySelector(isB ? "#team-b" : "#team-a").appendChild(liItem);
        });
    });

    if (extraTime) {
        await tickDownExtraTime();
    } else {
        await tickDown();
    }

    await tickDownRound();
    cycleTeams();
}
