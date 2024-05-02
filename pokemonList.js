const mongoose = require('mongoose');
const axios = require('axios');
const bcrypt = require("bcrypt")

mongoose.connect('mongodb+srv://jaxgat17:JJXv36Anp3EFkZ9j@jaxgat.t5phefy.mongodb.net/pokemonDB?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB Atlas');
})
.catch(error => {
  console.error('Error connecting to MongoDB Atlas:', error);
});

const userSchema = new mongoose.Schema ({
  firstName: {
    type: String,
    required: [true, "first name is required"]
  },
  lastName: {
    type: String,
    required: [true, "last name is required"]
  },
  email: {
    type: String,
    required: [true, "email is required"],
    unique: true
  },
  encryptedPassword: {
    type: String,
    required: [true, "password is required"]
  },

}, 
{
 toJSON: {
   versionKey: false,
   transform: function(doc, ret) {
     delete ret.email
     delete ret.encryptedPassword
   }
 }
});


userSchema.methods.setEncryptedPassword = function (plainPassword) {
  var promise = new Promise((resolve, reject) => {
    bcrypt.hash(plainPassword, 12).then(hash => {
      this.encryptedPassword = hash;
      resolve()
    })
  })
  return promise;
};

userSchema.methods.verifyEncryptedPassword = function (plainPassword) {

  var promise = new Promise((resolve, reject) => {
      console.log(plainPassword)
      console.log(this.encryptedPassword)
      bcrypt.compare(plainPassword, this.encryptedPassword).then((result) => {
          resolve(result)
      })
  })
  return promise
};

const User = mongoose.model('users', userSchema);


const pokemon = mongoose.model('pokemon2s', {
    name: String,
    sprite: String,
    types: [String],
});

const teamSchema = new mongoose.Schema ({
  sprite: {
      type: [String]
  },
  name: {
    type: [String]
  },
  types: {
    type: [String]
  },
  teamName: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: [true, "team belongs to user"]
  }

});

const team = mongoose.model('teams', teamSchema);

async function getTopPokemon() {
  try {
    const result = await team.aggregate([
      { $unwind: "$name" },
      { $group: { _id: "$name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    return result;
  } catch (error) {
    console.error('Failed to retrieve top Pokémon:', error);
    throw error;
  }
}

getTopPokemon().then(console.log).catch(console.error);

module.exports = {
  pokemon: pokemon,
  team: team,
  User: User,
  getTopPokemon: getTopPokemon
}


/*
const team = mongoose.model('teams', {
  sprite: [String],
  name: [String],
  types: [String],
  teamName: String,
});
*/

// SCRIPT TO ADD / UPDATE THE POKEMON DATABASE
/*
const pokemonSchema = new mongoose.Schema({
  name: String,
  sprite: String,
  types: [String]
})

const Pokemon = mongoose.model('Pokemon2s', pokemonSchema);
async function fetchAndInsertPokemon() {
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=493');
    const pokemonList = response.data.results;

    for (const pokemon of pokemonList) {
      const pokemonDataResponse = await axios.get(pokemon.url);
      const { name, sprites, types } = pokemonDataResponse.data;
    
      const typeNames = types.map(type => type.type.name);

      await Pokemon.create({ name, sprite: sprites.front_default, types: typeNames });
    }

    console.log('Pokemon data inserted successfully.');
  } catch (error) {
    console.error('Error inserting Pokemon data:', error);
  } finally {
    mongoose.disconnect();
  }
}

fetchAndInsertPokemon();
*/

/*
const pokemonSchema = new mongoose.Schema({
  name: String,
  sprite: String
});


const Pokemon = mongoose.model('Pokemon', pokemonSchema);
async function fetchAndInsertPokemon() {
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=151');
    const pokemonList = response.data.results;

    for (const pokemon of pokemonList) {
      const pokemonDataResponse = await axios.get(pokemon.url);
      const { name, sprites } = pokemonDataResponse.data;
      await Pokemon.create({ name, sprite: sprites.front_default });
    }

    console.log('Pokemon data inserted successfully.');
  } catch (error) {
    console.error('Error inserting Pokemon data:', error);
  } finally {
    mongoose.disconnect();
  }
}
*/