const fs = require('fs-extra');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const TEMP_DIR = '/mnt/c/temp/';

function readRepositoriesList() {
  console.log('Reading repositories list...');
  const fileName = 'repositories.json';
  const repositories = fs.readJSONSync(fileName);
  repositories.forEach(it => {
    if (!it.isDone) {
      it.isDone = false;
    }
  });
  fs.writeJSON(fileName, repositories, {spaces: 2});

  console.log('Reading repositories list SUCCESS');
  return repositories.filter(it => !it.isDone);
}

function saveDoneRepository(repository) {
  console.log('Saving done repository...');
  const fileName = 'repositories.json';
  const repositories = fs.readJSONSync(fileName);
  repositories.forEach(it => {
    if (it.text === repository.text) {
      it.isDone = true;
    }
  });
  fs.writeJSON(fileName, repositories, {spaces: 2});
  console.log('Saving done repository SUCCESS');
}

function updatePackageJsonScripts(repository) {
  console.log('Updating package.json scripts...');
  const path = `${TEMP_DIR}${repository.text}/package.json`;
  const packageJson = fs.readJSONSync(path);
  packageJson.scripts['prettier-changed'] = 'pretty-quick';
  packageJson.scripts['prettier-all'] = 'prettier --write \"**/*.js\"';
  packageJson.scripts['precommit'] = 'pretty-quick --staged';
  packageJson.scripts['eslint-all'] = 'eslint src --fix';
  fs.writeJSON(path, packageJson, {spaces: 2});
  console.log('Updating package.json scripts SUCCESS');

  return packageJson;
}

async function installPackages(repository, packageJson) {
  console.log('Installing packages...');
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }

  const pool = [
    'babel-eslint',
    'eslint',
    'eslint-plugin-import',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react'];
  const packagesToDelete = [];
  pool.forEach(it => {
    if (packageJson.devDependencies[it]) {
      packagesToDelete.push(it);
    }
  });
  let removeCommand = '';
  if (packagesToDelete.length > 0) {
    removeCommand = `&& yarn remove ${packagesToDelete.join(' ')}`;
  }

  console.log(`Removing the following packages: ${packagesToDelete.join(' ')}`);
  const command = `cd ${TEMP_DIR}${repository.text} ${removeCommand} && yarn upgrade @ridecell/eslint-config-react && yarn add --dev husky`;
  try {
    await exec(command);
  } catch (e) {
    console.log("Removing failed, trying new key before.");
    await copyNpmrc(repository);
    await exec(command);
  }
  console.log('Installing packages SUCCESS');
}

async function copyNpmrc(repository) {
  console.log('Copying .npmrc...');
  await exec(`cp -r ./files-to-copy/.npmrc ${TEMP_DIR}${repository.text}`);
  console.log('Copying .npmrc SUCCESS');
}

async function cloneRepo(repository) {
  console.log('Cloning repository...');
  await exec(`cd ${TEMP_DIR} && git clone ${repository.url}`);
  console.log('Cloning repository SUCCESS');
}

async function checkoutBranch(repository) {
  console.log('Checking out branch...');
  await exec(
      `cd ${TEMP_DIR}${repository.text} && git checkout -b "ACAISOFT-2433"`);
  console.log('Checking out branch SUCCESS');
}

async function pushBranch(repository) {
  console.log('Pushing branch...');
  await exec(
      `cd ${TEMP_DIR}${repository.text} && git push origin "ACAISOFT-2433"`);
  console.log('Pushing branch SUCCESS');
}

async function gitCommit(repository, message) {
  console.log('Commiting...');
  await exec(
      `cd ${TEMP_DIR}${repository.text} && git add . && git commit -m "${message}"`);
  console.log('Commiting SUCCESS');
}

async function copyFiles(repository) {
  console.log('Copying files...');
  await exec(`cp -r ./files-to-copy/. ${TEMP_DIR}${repository.text}`);
  console.log('Copying files SUCCESS');
}

async function prettify(repository) {
  console.log('Prettifying...');
  await exec(`cd ${TEMP_DIR}${repository.text} && yarn prettier-all`);
  console.log('Prettifying SUCCESS');
}

async function eslint(repository) {
  console.log('Eslinting...');
  await exec(`cd ${TEMP_DIR}${repository.text} && yarn eslint-all`);
  console.log('Eslinting SUCCESS');
}

async function createPullRequest(repository) {
  console.log('Creating Pull Request...');
  const prTitle = '"[ACAISOFT-2433] Integration with prettier"';
  const reviewers = '"jakubdrozdek,karol-pudlo,mcieniewski"';
  await exec(
      `cd ${TEMP_DIR}${repository.text} && hub pull-request -m ${prTitle} -r ${reviewers}`);
  console.log('Creating Pull Request SUCCESS');
}

async function tryBuilding(repository) {
  console.log('Building...');
  await exec(`cd ${TEMP_DIR}${repository.text} && yarn build`);
  console.log('Building SUCCESS');
}

async function tryDecrypting(repository) {
  console.log('Decrypting...');
  try {
    await exec(`cd ${TEMP_DIR}${repository.text} && make env_decrypt`);
  } catch (e) {
    console.log('No env_decrypt');
  }
  console.log('Decrypting SUCCESS');
}

async function clearCache(repository) {
  console.log('Clearing cache...');
  await exec(`cd ${TEMP_DIR}${repository.text} && yarn cache clean`);
  console.log('Clearing cache SUCCESS');
}

// git config --global credential.helper 'cache --timeout 28800'
async function handleRepository(repository) {
  console.log(`----- HANDLING ${repository.text} -----`);
  await cloneRepo(repository);
  await tryDecrypting(repository);
  await checkoutBranch(repository);
  const packageJson = await updatePackageJsonScripts(repository);
  await copyFiles(repository);
  await clearCache(repository);
  await installPackages(repository, packageJson);
  await gitCommit(repository, 'chore: Integrated project with prettier #2433');
  await prettify(repository);
  try {
    await gitCommit(repository, 'chore: Prettiefied the whole project #2433');
  } catch (e) {
    console.log('No changes.');
  }
  await eslint(repository);
  try {
    await gitCommit(repository, 'chore: Linted the whole project #2433');
  } catch (e) {
    console.log('No changes.');
  }
  await pushBranch(repository);
  // // await tryBuilding(repository)
  await createPullRequest(repository);
  await saveDoneRepository(repository);
}

setTimeout(async () => {
  const repositories = readRepositoriesList();
  for (repository of repositories) {
    await handleRepository(repository);
  }
  // await handleRepository(repositories[0]);
});
