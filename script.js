<script>
    document.addEventListener('DOMContentLoaded', function() {
        // 로컬 스토리지에서 계정 데이터 불러오기
        let accounts = JSON.parse(localStorage.getItem('cocAccounts')) || [];
        let currentEditIndex = null;
        
        // DOM 요소
        const accountForm = document.getElementById('accountForm');
        const accountList = document.getElementById('accountList');
        const cancelEditBtn = document.getElementById('cancelEdit');
        const addTimeBtn = document.getElementById('addTimeBtn');
        
        // 폼 제출 이벤트 처리
        accountForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const index = parseInt(document.getElementById('index').value);
            const accountName = document.getElementById('accountName').value;
            const bonusTime = document.getElementById('bonusTime').value;
            const memo = document.getElementById('memo').value;
            const notes = document.getElementById('notes').value;
            
            // 인덱스 중복 확인
            if (accounts.some(acc => acc.index === index && (currentEditIndex === null || acc.index !== currentEditIndex))) {
                alert('이미 존재하는 Index 번호입니다. 다른 번호를 사용해주세요.');
                return;
            }
            
            const accountData = {
                index,
                accountName,
                bonusTime,
                memo,
                notes
            };
            
            if (currentEditIndex !== null) {
                // 기존 계정 수정
                const accountIndex = accounts.findIndex(acc => acc.index === currentEditIndex);
                accounts[accountIndex] = accountData;
                currentEditIndex = null;
                cancelEditBtn.style.display = 'none';
            } else {
                // 새 계정 추가
                accounts.push(accountData);
            }
            
            // 데이터 저장 및 화면 갱신
            saveAndRefresh();
            accountForm.reset();
        });
        
        // 취소 버튼 이벤트
        cancelEditBtn.addEventListener('click', function() {
            accountForm.reset();
            currentEditIndex = null;
            cancelEditBtn.style.display = 'none';
        });
        
        // 시간 추가 버튼 이벤트
        addTimeBtn.addEventListener('click', function() {
            const days = parseInt(document.getElementById('addDays').value) || 0;
            const hours = parseInt(document.getElementById('addHours').value) || 0;
            const minutes = parseInt(document.getElementById('addMinutes').value) || 0;
            
            if (days === 0 && hours === 0 && minutes === 0) {
                alert('추가할 시간을 입력해주세요.');
                return;
            }
            
            const bonusTimeInput = document.getElementById('bonusTime');
            let currentTime;
            
            if (bonusTimeInput.value) {
                currentTime = new Date(bonusTimeInput.value);
            } else {
                currentTime = new Date();
            }
            
            // 시간 추가
            currentTime.setDate(currentTime.getDate() + days);
            currentTime.setHours(currentTime.getHours() + hours);
            currentTime.setMinutes(currentTime.getMinutes() + minutes);
            
            // 날짜 포맷팅
            const formattedDate = formatDateTimeLocal(currentTime);
            bonusTimeInput.value = formattedDate;
            
            // 입력 필드 초기화
            document.getElementById('addDays').value = '';
            document.getElementById('addHours').value = '';
            document.getElementById('addMinutes').value = '';
        });
        
        // 데이터 저장 및 화면 갱신 함수
        function saveAndRefresh() {
            // 인덱스 순으로 정렬
            accounts.sort((a, b) => a.index - b.index);
            
            // 로컬 스토리지에 저장
            localStorage.setItem('cocAccounts', JSON.stringify(accounts));
            
            // 계정 목록 갱신
            refreshAccountList();
        }
        
        // 계정 목록 갱신 함수
        function refreshAccountList() {
            accountList.innerHTML = '';
            
            if (accounts.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="6" style="text-align: center;">등록된 계정이 없습니다.</td>';
                accountList.appendChild(row);
                return;
            }
            
            const now = new Date();
            
            accounts.forEach(account => {
                const row = document.createElement('tr');
                
                const bonusTime = new Date(account.bonusTime);
                const timeDiff = bonusTime - now;
                
                // 남은 시간 계산
                let remainingTime = '';
                let timeClass = '';
                
                if (timeDiff <= 0) {
                    remainingTime = 'Bonus available';
                    timeClass = 'bonus-available';
                } else {
                    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    remainingTime = `${hours}시간 ${minutes}분`;
                    
                    // 남은 시간에 따라 클래스 지정
                    if (hours < 1) {
                        timeClass = 'time-critical';
                    } else if (hours < 3) {
                        timeClass = 'time-warning';
                    } else {
                        timeClass = 'time-normal';
                    }
                }
                
                // 행 생성
                row.innerHTML = `
                    <td>${account.index}</td>
                    <td>${account.accountName}</td>
                    <td>${formatDateTime(account.bonusTime)}</td>
                    <td class="${timeClass}">${remainingTime}</td>
                    <td>${account.memo || ''}</td>
                    <td class="action-buttons">
                        <button class="edit-btn" data-index="${account.index}">수정</button>
                        <button class="delete-btn" data-index="${account.index}">삭제</button>
                    </td>
                `;
                
                accountList.appendChild(row);
            });
            
            // 수정 버튼 이벤트 추가
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    editAccount(index);
                });
            });
            
            // 삭제 버튼 이벤트 추가
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    deleteAccount(index);
                });
            });
        }
        
        // 계정 수정 함수
        function editAccount(index) {
            const account = accounts.find(acc => acc.index === index);
            
            if (account) {
                document.getElementById('index').value = account.index;
                document.getElementById('accountName').value = account.accountName;
                document.getElementById('bonusTime').value = account.bonusTime.replace(' ', 'T').slice(0, 16);
                document.getElementById('memo').value = account.memo || '';
                document.getElementById('notes').value = account.notes || '';
                
                currentEditIndex = index;
                cancelEditBtn.style.display = 'inline-block';
                
                // 폼으로 스크롤
                accountForm.scrollIntoView({ behavior: 'smooth' });
            }
        }
        
        // 계정 삭제 함수
        function deleteAccount(index) {
            if (confirm('정말로 이 계정을 삭제하시겠습니까?')) {
                accounts = accounts.filter(acc => acc.index !== index);
                saveAndRefresh();
            }
        }
        
        // 날짜 포맷팅 함수 (datetime-local 입력용)
        function formatDateTimeLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        
        // 날짜 포맷팅 함수 (표시용)
        function formatDateTime(dateTimeStr) {
            const date = new Date(dateTimeStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        }
        
        // 초기화
        cancelEditBtn.style.display = 'none';
        refreshAccountList();
        
        // 1분마다 자동 갱신
        setInterval(refreshAccountList, 60000);
    });
</script>