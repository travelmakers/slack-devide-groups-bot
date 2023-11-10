const { App } = require('@slack/bolt');
const serverless = require('serverless-http');
require('dotenv').config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true
});

app.command('/divide-groups', async ({ command, ack, say }) => {
  // 슬래시 커맨드 요청을 확인
  await ack();

  // 입력값을 공백으로 분리
  const [size, ...usersInput] = command.text.split(' ');

  // 첫 번째 파라미터를 인원수로 파싱
  const numberOfPeoplePerGroup = parseInt(size);

  // 인원수가 올바르지 않거나, 유저 목록이 없으면 오류 메시지 전송
  if (isNaN(numberOfPeoplePerGroup) || numberOfPeoplePerGroup <= 0) {
    await say('인원 수를 올바른 숫자로 입력해주세요.');
    return;
  }
  if (usersInput.length === 0) {
    await say('유저 목록을 입력해주세요. 예시: /divide-groups 3 U123,U234,U345');
    return;
  }

  // 쉼표로 구분된 유저 목록을 배열로 파싱
  const allUsers = usersInput.join(' ').split(',');

  // 유저들을 무작위로 섞는다
  const shuffledUsers = allUsers.sort(() => 0.5 - Math.random());

  // 인원수에 맞게 조를 나눈다
  let groupsMessage = ''; // 모든 그룹을 표현할 문자열
  const usedGroupNames = []; // 이미 사용된 그룹 이름을 추적
  const groups = [];
  while (shuffledUsers.length > 0) {
    let group = shuffledUsers.splice(0, numberOfPeoplePerGroup);
    // 마지막 그룹 처리
    if (group.length < numberOfPeoplePerGroup && groups.length > 0) {
      // 마지막 그룹을 이전 그룹에 추가
      groups[groups.length - 1].members = groups[groups.length - 1].members.concat(group);
      break;
    }
    // 새 그룹 생성
    let groupName = getRandomGroupName(usedGroupNames);
    if (groupName === null) {
      await say('유일한 그룹 이름을 모두 사용했습니다. 그룹을 더 이상 만들 수 없습니다.');
      return;
    }
    usedGroupNames.push(groupName);
    groups.push({ name: groupName, members: group });
  }
  // 현재 날짜 문자열을 가져옵니다.
  const todayDate = getCurrentDate();
  const now = new Date();
  const month = now.getMonth() + 1; // 월은 0부터 시작하므로 1을 더해줍니다.

  groupsMessage += `${month}월 밥조 <!channel>\n`;
  groupsMessage += `:flags: ${todayDate} 밥조 공지드립니다 !\n\n`;
  // 생성된 조를 하나의 문자열로 결합
  groups.forEach(group => {
    groupsMessage += `${group.name}: ${group.members.join(', ')}\n`; // 각 그룹을 새 줄로 구분
  });

  groupsMessage += `\n*오늘도 좋은 하루 되시길 바라며, 다들 식사:rice_ball: 맛있게 하세요!`;

  // 모든 그룹을 포함하는 메시지 한 번에 전송
  await say(groupsMessage);
});

// Express 앱을 기반으로 하는 Bolt 앱을 래핑합니다.
const handler = serverless(app.expressApp);

module.exports.handler = async (event, context) => {
  // Lambda 함수에 대한 HTTP 요청을 처리합니다.
  return await handler(event, context);
};