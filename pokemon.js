const express = require('express');
const session = require('express-session');
const model = require('./pokemonList');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


wss.on('connection', function connection(ws) {
  console.log("A new WebSocket client connected!");

  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
  });
});

function broadcastTopPokemon() {
    model.getTopPokemon().then(topPokemon => {
        const message = JSON.stringify({
            action: 'updateTopPokemon',
            pokemon: topPokemon
        });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
}

setInterval(broadcastTopPokemon, 60000);

app.use(cors())
app.use(express.urlencoded({extended: false}))
app.use(express.static("public"))
app.use(session( {
    secret: "uiojf23ji0239jfalw3093",
    saveUninitialized: true,
    resave: false,
    cookie: {secure: false}
}))

var that;

app.get('/pokemon', authorizeRequest, (request, response) => {

    const { name } = request.query;
    if (!name) {
        return response.status(400).json({ error: 'Missing Pokemon name in query parameter' });
    }
    model.pokemon.findOne({ name: name.toLowerCase() })
    .then(pokemon => {
        if (!pokemon) {
            return response.status(404).json({ error: 'Pokemon not found' });
        }
        response.set("Access-Control-Allow-Origin", "*");
        response.json(pokemon);
    })

});

app.get("/top-pokemon", function (request, response) {
    model.team.aggregate([  
        { $unwind: "$name" },
        { $group: { _id: "$name", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ])
    .then(topPokemon => {
        console.log("Top Pokémon:", topPokemon);
        response.set("Access-Control-Allow-Origin", "*");
        response.json(topPokemon);
    })
    .catch(error => {
        console.error('Error retrieving top Pokémon:', error);
        response.status(500).json({ error: 'Internal server error' });
    });
});
app.get("/teams", authorizeRequest, function (request, response) {
    const userId = request.session.userId
    model.team.find({ user: userId }).then((teams) => {
        console.log("teams from db:", teams);
        response.set("Access-Control-Allow-Origin", "*");
        response.json(teams);
    })
    .catch(error => {
        console.error('Error fetching teams:', error);
        response.status(500).json({ error: 'Internal server error' });
    });
});

app.get('/teams/:id', authorizeRequest, (req, res) => {
    const teamId = req.params.id;

    model.team.findById(teamId)
        .then(team => {
            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }
            res.json(team);
        })
        .catch(error => {
            console.error('Error fetching team:', error);
            res.status(500).json({ error: 'Internal server error' });
        });
});

app.post("/teams",authorizeRequest, function(request, response) {

    console.log("request body:", request.body);
    const newTeam = new model.team({
        sprite: request.body.sprite,
        name: request.body.name,
        types: request.body.types,
        teamName: request.body.teamName,
        user: request.session.userId
        
    })
    newTeam.save().then(() =>{
        response.set("Access-Control-Allow-Origin", "*")
        response.status(201).send("Created")

    })
})

app.put("/teams/:id", authorizeRequest, function(request, response) {
    console.log("request body:", request.body);
    const teamId = request.params.id;
    const updatedTeamData = {
        sprite: request.body.sprite,
        name: request.body.name,
        types: request.body.types,
        teamName: request.body.teamName
    };

    model.team.findByIdAndUpdate(teamId, updatedTeamData, { new: true })
        .then(updatedTeam => {
            response.set("Access-Control-Allow-Origin", "*");
            response.status(201).send("Updated");
        })

    });


app.delete("/teams/:id",authorizeRequest,  function (request, response) {
    const teamId = request.params.id;

    model.team.findByIdAndDelete(teamId)
        .then(deletedTeam => {
            if (!deletedTeam) {
                return response.status(404).json({ error: 'Team not found' });
            }
            response.set("Access-Control-Allow-Origin", "*");
            response.status(200).json({ message: 'Team deleted successfully' });
        })
        .catch(error => {
            console.error('Error deleting team:', error);
            response.status(500).json({ error: 'Internal server error' });
        });
});

app.post("/users", function (request, response) {
    console.log("request body:", request.body)
    const newUser = new model.User({
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        email: request.body.email
    });

    newUser.setEncryptedPassword(request.body.plainPassword).then(function () {
        newUser.save().then(()=> {
            response.status(201).json("new user added");
        }).catch((error) => {
            if (error.errors) {
                var errorMessages = {};
                for (var fieldName in error.errors) {
                    errorMessages[fieldName] = error.errors[fieldName].message;
                }
                response.status(422).json(errorMessages);
            } else if (error.code == 11000) {
                response.status(422).json({ email: "user with email already exists" });
            } else {
                response.status(500).send("Unknown error");
            }
        });
    });
});

// user: request.session.userId
app.post("/session", function (request, response) {
    model.User.findOne({ email: request.body.email }).then(function (user) {
        if (user) {
            user.verifyEncryptedPassword(request.body.plainPassword).then(function (match) {
                if (match) {

                    request.session.userId = user._id;
                    //that = user._id;
                    //response.status(201).json({ userId: user._id });
                    console.log("In post", request.session.userId)
                    response.status(201).send("authenticated")

                } else {
                    response.status(401).send("Not Authenticated");
                }
            });
        } else {
            response.status(401).send("Not Authenticated");
        }
    })
});
app.get("/session", function(request, response) {
    
    console.log("Request session: ", request.session)
    console.log("here")
    console.log("Request session userId: ", request.session.userId)
    console.log("here now")
    //request.session.userId = that;
    if (request.session && request.session.userId) {
        console.log("2 Request session userId: ", request.session.userId)
        model.User.findById(request.session.userId)
            .then(user => {
                if (user) {
                    const userDetails = {
                        firstName: user.firstName,
                        lastName: user.lastName
                    };
                    response.status(200).json({ user: userDetails });
                } else {
                    response.status(404).send("User not found");
                }
            })
            .catch(error => {
                console.error("Error finding user:", error);
                response.status(500).send("Internal Server Error");
            });
    } else {
        response.status(401).send("Not authenticated");
    }
});

app.delete("/session", function (request, response){
    request.session.userId = null;
    response.status(200).send("Successfully logged out.")
});


function authorizeRequest(request, response, next) {
    if (request.session && request.session.userId) {
        model.User.findOne({ _id: request.session.userId }).then(function (user) {
            if (user) {
                request.user = user;
                next();
            } else {
                response.status(401).send("Not authenticated");
            }
        }).catch((error) => {
            console.error("Error in authorizeRequest middleware:", error);
            response.status(500).send("Internal Server Error");
        });
    } else {
        response.status(401).send("Not authenticated");
    }
}
/*
// not being used
function authorizeRequest(adminOnly) {
    return function (request, response, next) {
    if (request.session && request.session.userId) {
        model.User.findOne({ _id: request.session.userId}).then(function (user) {
            if (user && (!adminOnly || user.admin)) {
                request.user = user
            
                next()
            } else {
                response.status(401).send("Not authenitcated")
            }
        })
    } else {
        response.status(401).send("Not authenticated")
    }
}
}
*/
const PORT = process.env.PORT || 8080;

// var server = app.listen etc
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
// const ww = new WebSocket.WebSocketSerever({ server: server })

// web socket code goes here


