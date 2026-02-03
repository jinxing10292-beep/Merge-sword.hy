// 게임 상태
let gameState = {
    gold: 54,
    ruby: 0,
    playerLevel: 1,
    inventory: Array(25).fill(null),
    swordPrice: 20,
    draggedIndex: null,
    currentTab: 'auto',
    totalMerges: 0,
    totalEnhances: 0,
    totalGoldEarned: 0,
    highestSwordLevel: 1,
    quests: [],
    achievements: [],
    completedAchievements: []
};

// 초기 검 추가
gameState.inventory[0] = {level: 1, enhancement: 0};

// 퀘스트 정의
const dailyQuests = [
    { id: 'merge5', name: '검 5번 합성하기', target: 5, current: 0, reward: 50, type: 'merge' },
    { id: 'enhance3', name: '검 3번 강화하기', target: 3, current: 0, reward: 100, type: 'enhance' },
    { id: 'level5', name: 'Lv.5 검 만들기', target: 5, current: 0, reward: 200, type: 'level' },
    { id: 'gold500', name: '골드 500 모으기', target: 500, current: 0, reward: 150, type: 'gold' }
];

// 업적 정의
const achievementList = [
    { id: 'first_merge', name: '첫 합성', desc: '검을 처음 합성하기', target: 1, type: 'merge', reward: 50 },
    { id: 'merge_master', name: '합성 마스터', desc: '검 50번 합성', target: 50, type: 'merge', reward: 500 },
    { id: 'enhance_master', name: '강화 마스터', desc: '검 30번 강화', target: 30, type: 'enhance', reward: 300 },
    { id: 'level10', name: '전설의 검', desc: 'Lv.10 검 만들기', target: 10, type: 'level', reward: 1000 },
    { id: 'rich', name: '부자', desc: '골드 10,000 모으기', target: 10000, type: 'gold', reward: 2000 }
];

// 초기화
function initGame() {
    const saved = localStorage.getItem('mergeSwordGame');
    if (saved) {
        const savedState = JSON.parse(saved);
        Object.assign(gameState, savedState);
    } else {
        gameState.quests = JSON.parse(JSON.stringify(dailyQuests));
        gameState.achievements = JSON.parse(JSON.stringify(achievementList));
    }
}

// 저장
function saveGame() {
    localStorage.setItem('mergeSwordGame', JSON.stringify(gameState));
}

// 레벨별 초당 골드
function getBaseGoldPerSecond(level) {
    return 0.1 * Math.pow(2, level - 1);
}

// 강화 보너스
function getEnhancementBonus(enhancement) {
    return Math.pow(1.2, enhancement);
}

// 검의 총 초당 골드
function getSwordGoldPerSecond(sword) {
    const base = getBaseGoldPerSecond(sword.level);
    const bonus = getEnhancementBonus(sword.enhancement);
    return base * bonus;
}

// DOM 요소
const goldDisplay = document.getElementById('gold');
const rubyDisplay = document.getElementById('ruby');
const goldStat = document.getElementById('goldStat');
const rubyStat = document.getElementById('rubyStat');
const playerLevelDisplay = document.getElementById('playerLevel');
const gpsDisplay = document.getElementById('gpsDisplay');
const inventoryEl = document.getElementById('inventory');
const buySwordBtn = document.getElementById('buySwordBtn');
const enhanceBtn = document.getElementById('enhanceBtn');
const sortBtn = document.getElementById('sortBtn');
const sellAllBtn = document.getElementById('sellAllBtn');
const luckyBoxBtn = document.getElementById('luckyBoxBtn');
const questBtn = document.getElementById('questBtn');
const achievementBtn = document.getElementById('achievementBtn');
const enhanceModal = document.getElementById('enhanceModal');
const questModal = document.getElementById('questModal');
const achievementModal = document.getElementById('achievementModal');
const luckyBoxModal = document.getElementById('luckyBoxModal');
const closeModalBtn = document.getElementById('closeModal');
const confirmEnhanceBtn = document.getElementById('confirmEnhance');
const cancelEnhanceBtn = document.getElementById('cancelEnhance');

let selectedSlotForEnhance = null;

// 탭 전환
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tab + 'Tab').classList.add('active');
        gameState.currentTab = tab;
        
        // 정보 탭일 때 통계 업데이트
        if (tab === 'info') {
            document.getElementById('statMerges').textContent = gameState.totalMerges;
            document.getElementById('statEnhances').textContent = gameState.totalEnhances;
            document.getElementById('statHighestLevel').textContent = gameState.highestSwordLevel;
            document.getElementById('statTotalGold').textContent = Math.floor(gameState.totalGoldEarned);
        }
    });
});

// 화면 업데이트
function updateDisplay() {
    goldDisplay.textContent = Math.floor(gameState.gold);
    rubyDisplay.textContent = gameState.ruby;
    goldStat.textContent = Math.floor(gameState.gold);
    rubyStat.textContent = gameState.ruby;
    playerLevelDisplay.textContent = `Lv.${gameState.playerLevel}`;
    
    let totalGPS = 0;
    gameState.inventory.forEach(sword => {
        if (sword) totalGPS += getSwordGoldPerSecond(sword);
    });
    gpsDisplay.textContent = totalGPS.toFixed(2);
    
    const activeQuests = gameState.quests.filter(q => q.current < q.target).length;
    document.getElementById('questBadge').textContent = activeQuests;
    
    const newAchievements = gameState.achievements.filter(a => 
        !gameState.completedAchievements.includes(a.id) && checkAchievement(a)
    ).length;
    document.getElementById('achievementBadge').textContent = newAchievements;
    
    inventoryEl.innerHTML = '';
    gameState.inventory.forEach((sword, index) => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = index;
        
        if (sword) {
            slot.classList.add('has-sword');
            const gps = getSwordGoldPerSecond(sword);
            const enhanceText = sword.enhancement > 0 ? `+${sword.enhancement}` : '';
            
            let levelColor = '#ffc107';
            if (sword.level >= 10) levelColor = '#ff1744';
            else if (sword.level >= 7) levelColor = '#e91e63';
            else if (sword.level >= 5) levelColor = '#9c27b0';
            else if (sword.level >= 3) levelColor = '#2196f3';
            
            slot.innerHTML = `
                <div class="sword-icon-inv">⚔️</div>
                <div class="sword-level-inv" style="color: ${levelColor}">Lv.${sword.level}</div>
                ${enhanceText ? `<div class="sword-enhance-inv">${enhanceText}</div>` : ''}
                <div class="sword-gold-inv">${gps.toFixed(2)}G/s</div>
            `;
            
            slot.draggable = true;
            slot.addEventListener('dragstart', handleDragStart);
            slot.addEventListener('dragend', handleDragEnd);
        }
        
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('click', () => handleSlotClick(index));
        
        inventoryEl.appendChild(slot);
    });
    
    saveGame();
}

function handleDragStart(e) {
    const slot = e.currentTarget;
    const index = parseInt(slot.dataset.index);
    gameState.draggedIndex = index;
    slot.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    slot.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const targetIndex = parseInt(e.currentTarget.dataset.index);
    const sourceIndex = gameState.draggedIndex;
    
    if (sourceIndex === null || sourceIndex === targetIndex) return;
    
    const sourceSword = gameState.inventory[sourceIndex];
    const targetSword = gameState.inventory[targetIndex];
    
    if (sourceSword && targetSword && 
        sourceSword.level === targetSword.level && 
        sourceSword.enhancement === targetSword.enhancement) {
        
        gameState.inventory[sourceIndex] = null;
        gameState.inventory[targetIndex] = {
            level: sourceSword.level + 1,
            enhancement: 0
        };
        
        gameState.totalMerges++;
        if (sourceSword.level + 1 > gameState.highestSwordLevel) {
            gameState.highestSwordLevel = sourceSword.level + 1;
        }
        
        updateQuest('merge', 1);
        updateQuest('level', sourceSword.level + 1);
        checkAchievements();
        
        showFloatingText(`🗡️ Lv.${sourceSword.level + 1} 검 획득!`);
    } else {
        gameState.inventory[sourceIndex] = targetSword;
        gameState.inventory[targetIndex] = sourceSword;
    }
    
    gameState.draggedIndex = null;
    updateDisplay();
}

function handleSlotClick(index) {
    if (!gameState.inventory[index]) return;
    selectedSlotForEnhance = index;
}

function buySword() {
    if (gameState.gold >= gameState.swordPrice) {
        const emptyIndex = gameState.inventory.findIndex(slot => slot === null);
        
        if (emptyIndex === -1) {
            showFloatingText('❌ 인벤토리가 가득 찼습니다!');
            return;
        }
        
        gameState.gold -= gameState.swordPrice;
        gameState.inventory[emptyIndex] = {level: 1, enhancement: 0};
        updateDisplay();
        showFloatingText('⚔️ Lv.1 검 획득!');
    }
}

function openEnhanceModal() {
    if (selectedSlotForEnhance === null || !gameState.inventory[selectedSlotForEnhance]) {
        showFloatingText('❌ 강화할 검을 선택하세요!');
        return;
    }
    
    enhanceModal.classList.add('show');
}

function enhanceSword() {
    if (selectedSlotForEnhance === null) return;
    
    const sword = gameState.inventory[selectedSlotForEnhance];
    const cost = getEnhanceCost(sword);
    
    if (gameState.gold < cost) return;
    
    gameState.gold -= cost;
    
    const successRate = getSuccessRate(sword.enhancement);
    const random = Math.random() * 100;
    
    if (random < successRate) {
        sword.enhancement++;
        gameState.totalEnhances++;
        updateQuest('enhance', 1);
        checkAchievements();
        showFloatingText(`✨ 강화 성공! +${sword.enhancement}`);
    } else if (random < 100 - 10) {
        showFloatingText('😐 강화 유지');
    } else {
        gameState.inventory[selectedSlotForEnhance] = null;
        showFloatingText('💥 검 파괴!');
    }
    
    enhanceModal.classList.remove('show');
    selectedSlotForEnhance = null;
    updateDisplay();
}

function sortInventory() {
    const swords = gameState.inventory.filter(s => s !== null);
    
    swords.sort((a, b) => {
        if (a.level !== b.level) return b.level - a.level;
        return b.enhancement - a.enhancement;
    });
    
    gameState.inventory = Array(25).fill(null);
    swords.forEach((sword, index) => {
        gameState.inventory[index] = sword;
    });
    
    updateDisplay();
    showFloatingText('📊 정렬 완료!');
}

function getEnhanceCost(sword) {
    return Math.floor(50 * Math.pow(2, sword.enhancement));
}

function getSuccessRate(enhancement) {
    return Math.max(30, 70 - enhancement * 10);
}

function showFloatingText(text) {
    const floatingText = document.createElement('div');
    floatingText.textContent = text;
    floatingText.style.position = 'fixed';
    floatingText.style.left = '50%';
    floatingText.style.top = '40%';
    floatingText.style.transform = 'translate(-50%, -50%)';
    floatingText.style.color = '#ffc107';
    floatingText.style.fontSize = '2em';
    floatingText.style.fontWeight = 'bold';
    floatingText.style.pointerEvents = 'none';
    floatingText.style.zIndex = '10000';
    floatingText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    floatingText.style.animation = 'floatUp 1s ease-out';
    
    document.body.appendChild(floatingText);
    
    setTimeout(() => {
        floatingText.remove();
    }, 1000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -150%);
        }
    }
`;
document.head.appendChild(style);

function updateQuest(type, value) {
    gameState.quests.forEach(quest => {
        if (quest.type === type && quest.current < quest.target) {
            if (type === 'gold' || type === 'level') {
                quest.current = Math.max(quest.current, value);
            } else {
                quest.current += value;
            }
        }
    });
}

function checkAchievement(achievement) {
    switch(achievement.type) {
        case 'merge':
            return gameState.totalMerges >= achievement.target;
        case 'enhance':
            return gameState.totalEnhances >= achievement.target;
        case 'level':
            return gameState.highestSwordLevel >= achievement.target;
        case 'gold':
            return gameState.totalGoldEarned >= achievement.target;
        default:
            return false;
    }
}

function checkAchievements() {
    gameState.achievements.forEach(achievement => {
        if (!gameState.completedAchievements.includes(achievement.id) && checkAchievement(achievement)) {
            gameState.completedAchievements.push(achievement.id);
            gameState.gold += achievement.reward;
            showFloatingText(`🏆 업적 달성! +${achievement.reward}G`);
        }
    });
}

questBtn.addEventListener('click', () => {
    const questList = document.getElementById('questList');
    questList.innerHTML = '';
    
    gameState.quests.forEach(quest => {
        const questItem = document.createElement('div');
        questItem.className = 'quest-item';
        const completed = quest.current >= quest.target;
        
        questItem.innerHTML = `
            <div class="quest-info">
                <div class="quest-name">${quest.name}</div>
                <div class="quest-progress">${Math.min(quest.current, quest.target)} / ${quest.target}</div>
            </div>
            <button class="quest-reward-btn ${completed ? '' : 'disabled'}" 
                    ${completed ? '' : 'disabled'}
                    onclick="claimQuest('${quest.id}')">
                ${completed ? '보상 받기' : quest.reward + 'G'}
            </button>
        `;
        
        questList.appendChild(questItem);
    });
    
    questModal.classList.add('show');
});

document.getElementById('closeQuestModal').addEventListener('click', () => {
    questModal.classList.remove('show');
});

window.claimQuest = function(questId) {
    const quest = gameState.quests.find(q => q.id === questId);
    if (quest && quest.current >= quest.target) {
        gameState.gold += quest.reward;
        quest.current = 0;
        showFloatingText(`✅ 퀘스트 완료! +${quest.reward}G`);
        updateDisplay();
        questBtn.click();
    }
};

achievementBtn.addEventListener('click', () => {
    const achievementList = document.getElementById('achievementList');
    achievementList.innerHTML = '';
    
    gameState.achievements.forEach(achievement => {
        const achievementItem = document.createElement('div');
        achievementItem.className = 'achievement-item';
        const completed = gameState.completedAchievements.includes(achievement.id);
        
        let progress = 0;
        switch(achievement.type) {
            case 'merge': progress = gameState.totalMerges; break;
            case 'enhance': progress = gameState.totalEnhances; break;
            case 'level': progress = gameState.highestSwordLevel; break;
            case 'gold': progress = Math.floor(gameState.totalGoldEarned); break;
        }
        
        achievementItem.innerHTML = `
            <div class="achievement-icon">${completed ? '🏆' : '🔒'}</div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.desc}</div>
                <div class="achievement-progress">${Math.min(progress, achievement.target)} / ${achievement.target}</div>
            </div>
            <div class="achievement-reward">${completed ? '완료!' : achievement.reward + 'G'}</div>
        `;
        
        if (completed) achievementItem.classList.add('completed');
        
        achievementList.appendChild(achievementItem);
    });
    
    achievementModal.classList.add('show');
});

document.getElementById('closeAchievementModal').addEventListener('click', () => {
    achievementModal.classList.remove('show');
});

luckyBoxBtn.addEventListener('click', () => {
    luckyBoxModal.classList.add('show');
    document.getElementById('boxResult').innerHTML = '';
});

document.getElementById('closeLuckyBoxModal').addEventListener('click', () => {
    luckyBoxModal.classList.remove('show');
});

document.getElementById('openBoxBtn').addEventListener('click', () => {
    if (gameState.gold < 100) {
        showFloatingText('❌ 골드가 부족합니다!');
        return;
    }
    
    gameState.gold -= 100;
    
    const random = Math.random() * 100;
    let result = '';
    
    if (random < 1) {
        gameState.ruby += 10;
        result = '💎💎💎<br>루비 10개!<br>(대박!)';
    } else if (random < 5) {
        gameState.ruby += 3;
        result = '💎💎💎<br>루비 3개!';
    } else if (random < 15) {
        gameState.gold += 500;
        result = '💰💰💰<br>골드 500!';
    } else if (random < 35) {
        gameState.gold += 200;
        result = '💰💰<br>골드 200!';
    } else if (random < 60) {
        const level = Math.floor(Math.random() * 3) + 2;
        const emptyIndex = gameState.inventory.findIndex(s => s === null);
        if (emptyIndex !== -1) {
            gameState.inventory[emptyIndex] = {level, enhancement: 0};
            result = `⚔️<br>Lv.${level} 검!`;
        } else {
            gameState.gold += 100;
            result = '❌ 인벤토리 가득<br>골드 100 환불';
        }
    } else {
        gameState.gold += 50;
        result = '💰<br>골드 50';
    }
    
    document.getElementById('boxResult').innerHTML = result;
    updateDisplay();
});

sellAllBtn.addEventListener('click', () => {
    let totalValue = 0;
    gameState.inventory.forEach(sword => {
        if (sword) {
            totalValue += Math.floor(10 * Math.pow(2, sword.level - 1) * (1 + sword.enhancement * 0.5));
        }
    });
    
    if (totalValue === 0) {
        showFloatingText('❌ 판매할 검이 없습니다!');
        return;
    }
    
    if (confirm(`모든 검을 ${totalValue}G에 판매하시겠습니까?`)) {
        gameState.inventory = Array(25).fill(null);
        gameState.gold += totalValue;
        showFloatingText(`💰 ${totalValue}G 획득!`);
        updateDisplay();
    }
});

buySwordBtn.addEventListener('click', buySword);
enhanceBtn.addEventListener('click', openEnhanceModal);
sortBtn.addEventListener('click', sortInventory);
confirmEnhanceBtn.addEventListener('click', enhanceSword);
cancelEnhanceBtn.addEventListener('click', () => {
    enhanceModal.classList.remove('show');
    selectedSlotForEnhance = null;
});
closeModalBtn.addEventListener('click', () => {
    enhanceModal.classList.remove('show');
    selectedSlotForEnhance = null;
});

enhanceModal.addEventListener('click', (e) => {
    if (e.target === enhanceModal) {
        enhanceModal.classList.remove('show');
        selectedSlotForEnhance = null;
    }
});

setInterval(() => {
    let totalGold = 0;
    gameState.inventory.forEach(sword => {
        if (sword) {
            totalGold += getSwordGoldPerSecond(sword) / 10;
        }
    });
    
    if (totalGold > 0) {
        gameState.gold += totalGold;
        gameState.totalGoldEarned += totalGold;
        updateQuest('gold', gameState.gold);
        checkAchievements();
        updateDisplay();
    }
}, 100);

initGame();
updateDisplay();

// 수동 저장 버튼
document.getElementById('saveBtn').addEventListener('click', () => {
    saveGame();
    showFloatingText('💾 게임이 저장되었습니다!');
});

// 초기화 버튼
document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('정말로 게임을 초기화하시겠습니까?\n모든 진행상황이 삭제됩니다!')) {
        if (confirm('정말 확실합니까? 되돌릴 수 없습니다!')) {
            localStorage.removeItem('mergeSwordGame');
            location.reload();
        }
    }
});

// 페이지 나갈 때 자동 저장
window.addEventListener('beforeunload', () => {
    saveGame();
});

// 5초마다 자동 저장
setInterval(() => {
    saveGame();
}, 5000);
