import Sequelize from "sequelize";
import mongoose from "mongoose";

import User from "../app/models/User";
import Recipiet from "../app/models/Recipient";
import Deliveryman from "../app/models/Deliveryman";
import File from "../app/models/File";
import Order from "../app/models/Order";
import DeliveryProblems from "../app/models/DeliveryProblems";

import databaseConfig from "../config/database";

const models = [User, Recipiet, Order, Deliveryman, File, DeliveryProblems];

class Datebase {
  constructor() {
    this.init();
    this.mongo();
  }

  init() {
    this.connection = new Sequelize(databaseConfig);

    models
      .map(model => model.init(this.connection))
      .map(model => model.associate && model.associate(this.connection.models));
  }

  mongo() {
    this.mongoConnection = mongoose.connect(
      "mongodb://localhost:27017/fastfeet",
      {
        useNewUrlParser: true,
        useFindAndModify: true,
        useUnifiedTopology: true,
      }
    );
  }
}

export default new Datebase();
