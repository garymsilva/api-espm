const configRethinkDB = require('../config/rethinkdb');
const thinky = require('thinky')(configRethinkDB);
const type = thinky.type;

/**
 * Creates the base model for a table
 *
 * @param {any} tableName Name of the table
 * @return {any} Base model
 */
const baseModel = tableName => {
  return thinky.createModel(tableName, {
    id: type.number(),
    date: type.date().default(new Date())
  });
};

/**
 * Creates the base model for favorite protocol specific table
 *
 * @param {any} tableName
 * @returns
 */

const sepBaseModel = tableName => {
  const entity = thinky.createModel(tableName, {
    id: type.number(),
    date: type.date().default(new Date()),
    protocols: type.array().schema({
      number: type.string(),
      subject: type.string(),
      summary: type.string(),
      status: type.string()
    })
  });

  // entity.ensureIndex('favoriteProcess', doc => doc('id'), { multi: true });
  entity.ensureIndex('favoriteProcess', doc => doc('protocols')('number'), { multi: true });
  entity.ensureIndex('favoriteProcessOld', doc => doc('favoriteProcess'), { multi: true });

  return entity;
};

const FavoriteBusLines = baseModel('favoriteBusLines');
const FavoriteBuscaBus = baseModel('favoriteBuscaBus');
const Settings = baseModel('settings');
const Vehicles = baseModel('vehicles');
const FavoriteSepProtocol = sepBaseModel('favoriteSepProtocol');

module.exports = () => {
  const dataService = new Object();

  /**
   * Generic save method
   *
   * @param {any} Model Rethink model
   * @param {any} data Object to be saved
   * @returns {any} Save result
   */
  const save = (Model, data) => {
    data.id = data.userId;
    delete data.userId;

    return Model.get(data.id)
      .run()
      .then(res => {
        if (new Date(data.date).getTime() > new Date(res.date).getTime()) {
          return Model.get(data.id)
            .replace(data)
            .execute();
        } else {
          return res;
        }
      })
      .catch(err => {
        if (err.name === 'DocumentNotFoundError') {
          const obj = new Model(data);
          return obj.save();
        } else {
          throw err;
        }
      });
  };

  // FavoriteBusLines
  dataService.saveFavoriteBusLines = data => {
    return save(FavoriteBusLines, data);
  };

  dataService.getFavoriteBusLines = userId => {
    return FavoriteBusLines.get(userId).run();
  };

  // FavoriteBuscaBus
  dataService.saveFavoriteBuscaBus = data => {
    return save(FavoriteBuscaBus, data);
  };

  dataService.getFavoriteBuscaBus = userId => {
    return FavoriteBuscaBus.get(userId).run();
  };

  // Settings
  dataService.saveSettings = data => {
    return save(Settings, data);
  };

  dataService.getSettings = userId => {
    return Settings.get(userId).run();
  };

  // Vehicles
  dataService.saveVehicles = data => {
    return save(Vehicles, data);
  };

  dataService.getVehicles = userId => {
    return Vehicles.get(userId).run();
  };

  // FavoriteSepProtocol
  dataService.saveFavoriteSepProtocol = data => {
    return save(FavoriteSepProtocol, data);
  };

  dataService.getFavoriteSepProtocol = userId => {
    return FavoriteSepProtocol.get(userId).run();
  };

  dataService.getUsersByFavoriteSepProtocol = number => {
    const oldStyleProcess = FavoriteSepProtocol.getAll(number, { index: 'favoriteProcessOld' }).run();
    const process = FavoriteSepProtocol.getAll(number, { index: 'favoriteProcess' }).run();

    return Promise.all([oldStyleProcess, process]).then(userList =>
      userList.reduce((a, b) => a.concat(b)).map(user => user.id)
    );
  };

  return dataService;
};
