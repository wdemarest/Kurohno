//TWEAKS
let boardSize = 8;

let gameSettings = {
    width: boardSize,
    height: boardSize,
    onlyDefaultWhenSurrounded: true,
    mustSeeMax: boardSize,
    atLeasts: true
}

let viewSettings = {
    padding: 5, // Padding between circles
    boardWidthPx: 600,
    boardHeightPx: 600,
    xOffset: 400,
    yOffset: 400
}

let gameBoard;
let solvedGameBoard;
let gameWon = false;

let showLocks = false;

//VIEW

let canvas = document.getElementById('myCanvas');
let ctx = canvas.getContext('2d');

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard(gameBoard);

    //DEBUG show solution
    drawBoard(solvedGameBoard, viewSettings.boardWidthPx, viewSettings.boardHeightPx,  viewSettings.xOffset+800, viewSettings.yOffset);
}

function drawBoard(board = gameBoard, widthPx = viewSettings.boardWidthPx, heightPx = viewSettings.boardHeightPx, xOffset = viewSettings.xOffset, yOffset = viewSettings.yOffset, padding = viewSettings.padding) {
    let circleRadius = (Math.min(widthPx / (2 * board[0].length), heightPx / (2 * board.length))) - padding; // Adjust the circle radius based on the board size

    //ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;

    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            let centerX = xOffset + x * (circleRadius * 2 + padding) + circleRadius;
            let centerY = yOffset + y * (circleRadius * 2 + padding) + circleRadius;

            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI, false);

            let cellColor = board[x][y].color;
            if (cellColor == null) {
                ctx.fillStyle = '#D8D8D8';
            } else {
                ctx.fillStyle = cellColor;
            }

            let cellLocked = board[x][y].colorLocked;
            if(showLocks && cellLocked){
                ctx.stroke();
            }

            ctx.fill();
            

            // Draw the mustSee value
            if(board[x][y].mustSee){
                ctx.fillStyle = 'white';

                if(gameWon){
                    ctx.fillStyle = '#48FF48';
                }

                ctx.font = circleRadius + 'px Arial'; // Adjust the font size based on the circle radius
                ctx.textAlign = 'center'; // Center the text horizontally
                ctx.textBaseline = 'middle'; // Center the text vertically

                let text = board[x][y].mustSee;

                if(board[x][y].atLeast){
                    if(board[x][y].mustSee > 0){
                        text = "≥" + text;
                    } else {
                        text = "";
                    }
                }

                ctx.fillText(text, centerX, centerY);
            }
        }
    }

    //label columns 0-8, and rows 0-8
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for(let i = 0; i < board.length; i++){
        ctx.fillText(i, xOffset + i * (circleRadius * 2 + padding) + circleRadius, yOffset - 20);
    }
    for(let i = 0; i < board[0].length; i++){
        ctx.fillText(i, xOffset - 20, yOffset + i * (circleRadius * 2 + padding) + circleRadius);
    }
}

//SIM

function Main() {
    gameBoard = generatePuzzle(gameSettings.width, gameSettings.height);
    solvedGameBoard = solve(gameBoard).board;

    render();

    initControls();

    for(let i = 0; i < 10; i++){
        console.log(i+"=====================================");
    }


}

function Cell(color) {
    this.color = color;
    this.mustSee;
    this.colorLocked = false;

    this.atLeast = false;
}

function generatePuzzle(width, height) {
    let solvedBoard = generateSolution(width, height)
    let board = JSON.parse(JSON.stringify(solvedBoard));

    let cellsRemoved = 0;
    
    //make a array of all the cells in randomized order
    let randomizedOrderCells = [];
    for(let i = 0; i < board.length; i++){
        for(let j = 0; j < board[i].length; j++){
            randomizedOrderCells.push({x: i, y: j});
        }
    }
    randomizedOrderCells.sort(() => Math.random() - 0.5);

    //Make cells empty until unsolvable
    
    while(randomizedOrderCells.length > 0){
        let solvable = true;
        let cell = randomizedOrderCells.pop();

        

        //shallow copy the cell
        let cellInfo = JSON.parse(JSON.stringify(board[cell.x][cell.y]));

        board[cell.x][cell.y].color = null;
        board[cell.x][cell.y].mustSee = null;
        

        if(solve(board).solvability != 1){
            //restore the cell
            board[cell.x][cell.y] = cellInfo;
        }else{
            cellsRemoved++;
        }
    }

    let randomizedOrderNumCells = [];
    for(let i = 0; i < board.length; i++){
        for(let j = 0; j < board[i].length; j++){
            if(board[i][j].mustSee != null){
                randomizedOrderNumCells.push({x: i, y: j});
            }
        }
    }
    randomizedOrderNumCells.sort(() => Math.random() - 0.5);

    if(gameSettings.atLeasts){
        //Make numCells into atLeasts until the board is unsolvable

        while(randomizedOrderNumCells.length > 0){
            let cell = randomizedOrderNumCells.pop();

            let originalMustSee = board[cell.x][cell.y].mustSee;

            board[cell.x][cell.y].atLeast = true;
            //mustsee between 1 and originalMustSee
            board[cell.x][cell.y].mustSee = Math.floor(Math.random() * originalMustSee) + 1;

            //drawBoard(board);

            if(solve(board).solvability != 1){
                //restore the cell
                board[cell.x][cell.y].atLeast = false;
                board[cell.x][cell.y].mustSee = originalMustSee;

            }else{
                console.log("atLeast-ified cell: " + cell.x + ", " + cell.y);
            }
        }

    }

    let boardArea = width * height;
    let remaining = boardArea - cellsRemoved;
    console.log("Cells remaining " + remaining + "/" + boardArea);
    console.log("(" + Math.round((remaining / boardArea) * 100) + "%)");

    //iterate through board
    for(let x = 0; x < board.length; x++){
        for(let y = 0; y < board[x].length; y++){
            if(board[x][y].color != null){
                board[x][y].colorLocked = true;
            }
        }
    }

    return board;
}

function generateSolution(width, height) {
    //make board a 2d array, and populate it with red cells and blue cells randomly
    let board = new Array(width);
    
    let boardValid = false;
    let attempts = 0;


    while (boardValid == false) {
        if(attempts > 100){
            console.log("TOO MANY ATTEMPTS IN GENERATE SOLUTION");
            break;
        }
        attempts++;
        boardValid = true;
        

        for (let x = 0; x < width; x++) {
            board[x] = new Array(height);
            for (let j = 0; j < height; j++) {
                let random = Math.random();
                if (random > 0.65) {
                    board[x][j] = new Cell('red');
                } else {
                    board[x][j] = new Cell('blue');
                }
            }
        }


        //set the mustSee property of each cell
        for (let x = 0; x < board.length; x++) {
            for (let y = 0; y < board[x].length; y++) {
                if(board[x][y].color == 'red'){
                    continue;
                }
                board[x][y].mustSee = countSeen(x, y, board);
                
                //check if mustSees are valid
                if(board[x][y].mustSee == 0 || board[x][y].mustSee > gameSettings.mustSeeMax){
                    boardValid = false;
                }
            }
        }
    }
    console.log("solution generation attempts: " + attempts);

    return board;
}

function iterateInDirection(direction, func) {
    let returnNum = 0;

    if(direction == "all"){
        for(let i = 0; i < 4; i++){
            returnNum += iterateInDirection(i, func);
        }

        return returnNum;
    }

    dx = 0;
    dy = 0;

    let i;
    for(i = 0; i < 100; i++){

        //0 is up, 1 is down, 2 is left, 3 is right
        if(direction == 0){
            dy--;
        } else if(direction == 1){
            dy++;
        } else if(direction == 2){
            dx--;
        } else if(direction == 3){
            dx++;
        }

        if(func(dx, dy)){
            returnNum ++;
        } else {
            break;
        }
    }
    if(i >= 100){throw "ERROR: iterateInDirection looped too many times";}

    return returnNum;
}

function inBounds(x, y, board) {
    if (x < 0 || x >= board.length || y < 0 || y >= board[x].length) {
        return false;
    } else {
        return true;
    }
}

function countSeen(x, y, board, direction = "all") {
    return iterateInDirection(direction, (dx, dy)=>{
        if(inBounds(x+dx, y+dy, board) && board[x+dx][y+dy].color == 'blue'){
            return true
        }else{
            return false
        }
    });
}

function addBluesFromNumCell(numCellX, numCellY, board, conclusion) {
    let addedBlue = false;

    for(let i = 0; i < 4; i++){
        iterateInDirection(i, (dx, dy)=>{ 
                let x = numCellX + dx;
                let y = numCellY + dy;
                if(Math.abs(dx) + Math.abs(dy) <= conclusion[i]){
                    if(board[x][y].color == 'red'){throw "ERROR: tried to add blue to red cell";}

                    if(board[x][y].color == null){
                        board[x][y].color = 'blue';
                        addedBlue = true;
                    }
                    return true;
                } else {
                    return false;
                }
            });
    }

    return addedBlue;
}

function fillInReds(board){
    for(let x = 0; x < board.length; x++){
        for(let y = 0; y < board[x].length; y++){
            if(board[x][y].color == null){
                //if cell cannot see any blues, default it to red

                if(gameSettings.onlyDefaultWhenSurrounded){

                    let canSeeBlue = false;
                    
                    iterateInDirection("all", (dx, dy)=>{
                        cellX = x + dx;
                        cellY = y + dy;

                        if(inBounds(cellX, cellY, board) && board[cellX][cellY].color == "blue"){
                            canSeeBlue = true;
                        }

                        if(inBounds(cellX, cellY, board) && board[cellX][cellY].color != "red"){
                            return true;
                        }
                        
                        return false;
                        
                    });

                    if(canSeeBlue == false){
                        board[x][y].color = "red";
                        //console.log("cell at " + x + ", " + y + " DEFAULTED");
                    }    

                }else{
                    board[x][y].color = "red";
                }

           }
        }
    }
}

function countPercentFull(board){
    let count = 0;
    let total = 0;
    for(let i = 0; i < board.length; i++){
        for(let j = 0; j < board[i].length; j++){
            total++;
            if(board[i][j].color != null){
                count++;
            }
        }
    }

    return count / total;
}

/*
//check that there are no ambiguous reds
if (board[x][y].color == 'red') {
    seesBluesInCurrentDirection = false;

    iterateInDirection("all", (dx, dy) => {
        let cellX = x+dx;
        let cellY = y+dy;

        if(!inBounds(cellX, cellY, board){
            //AMBIGUOUS RED FOUND!!!!!!!!!!!!!!!!!!!!!!!!
        }

        if(board[cellX][cellY].color == 'blue'){
            seesBluesInCurrentDirection = true;

        }

        if(board[cellX][cellY].mustSee > 0 || board[cellX][cellY].color == 'red'){
            seesBluesInCurrentDirection = false;
            return false;
        }
    });
}
*/

function solve(inputBoard, maxMoves = null){
    let board = JSON.parse(JSON.stringify(inputBoard));

    //MAKE A LIST OF ALL NUMBER CELLS (cells with a mustSee property)
    let numCells = [];
    for(let i = 0; i < board.length; i++){
        for(let j = 0; j < board[i].length; j++){
            if(board[i][j].mustSee != null){
                //shallow copy the cell with stringifying and parsing
                let numCell = JSON.parse(JSON.stringify(board[i][j]));
                numCell.x = i;
                numCell.y = j;
                numCells.push(numCell);
                console.log(numCell);
            }
        }
    }

    let progressMade = true;

    let movesMade = 0;

    while(progressMade && (maxMoves == null || movesMade < maxMoves)){
        progressMade = false;

        movesMade++;

        //LOOP THROUGH ALL NUMCELLS TO ADD BLUES
        for(let i = 0; i < numCells.length; i++){

            let cell = numCells[i];
            
            //MAKE SOLUTIONLIST
            let availableSpacesInDir = [];
            for(let j = 0; j < 4; j++){
                availableSpacesInDir[j] = iterateInDirection(j, (dx, dy)=>{
                    let x = cell.x + dx;
                    let y = cell.y + dy;

                    if(inBounds(x, y, board) && board[x][y].color != 'red'){
                        return true;
                    }else{
                        return false;
                    }
                })
            }
            
            let solutionList = [];
            for (let a = 0; a <= availableSpacesInDir[0]; a++) {
                for (let b = 0; b <= availableSpacesInDir[1]; b++) {
                    for (let c = 0; c <= availableSpacesInDir[2]; c++) {
                        for (let d = 0; d <= availableSpacesInDir[3]; d++) {
                            if (a + b + c + d === cell.mustSee) {
                                solutionList.push([a, b, c, d]);
                            }
                        }
                    }
                }
            }

        

            //REMOVE SOLUTIONS THAT OVERLOAD ANY NUMCELLS (including self)
            for(let j = 0; j < solutionList.length; j++){ //iterate through solutionList
                //create a hypothetical board, by creating the number of blue cells in each direction that the solution says
                
                let hypotheticalBoard = JSON.parse(JSON.stringify(board));

                addBluesFromNumCell(cell.x, cell.y, hypotheticalBoard, solutionList[j]);

                //drawBoard(hypotheticalBoard, 600, 600, 840, 40);
                //console.log("solution: " + solutionList[j] + " of numCell: " + cell.x + ", " + cell.y);
                //console.log("DRAWN");

                
                //iterate through numCells
                for(let k = 0; k < numCells.length; k++){
                    //if the numCell is overloaded, remove the solution from the solutionList
                    if(numCells[k].mustSee < countSeen(numCells[k].x, numCells[k].y, hypotheticalBoard) && !numCells[k].atLeast){
                        //console.log("removed solution: " + solutionList[j] + " of numCell: " + cell.x + ", " + cell.y);
                        solutionList.splice(j, 1);
                        j--;
                        break;
                    }
                }
            }

            //AND all solutions together
            let conclusion = [];
            for(let j = 0; j < solutionList.length; j++){
                if(j == 0){
                    conclusion = solutionList[j];
                } else {
                    for(let k = 0; k < 4; k++){
                        conclusion[k] = Math.min(conclusion[k], solutionList[j][k]);
                    }
                }
            }

            
            for(let j = 0; j < 4; j++){
                if(conclusion[j] > 0){
                    if(addBluesFromNumCell(cell.x, cell.y, board, conclusion)){
                        console.log("added blues to numCell: " + cell.x + ", " + cell.y, " with conclusion: " + conclusion);
                        progressMade = true;
                    }
                }
            }
        }

        //LOOP THROUGH ALL NUMCELLS TO CAP WITH REDS
        for(let i = 0; i < numCells.length; i++){

            let cell = numCells[i];
            
            //If this cell sees the number of blues equal to its mustSee, cap its 4 ends with reds
            console.log("cell.atLeast: " + cell.atLeast);   

            if(countSeen(cell.x, cell.y, board) == cell.mustSee && !cell.atLeast){
                console.log("capping numCell: " + cell.x + ", " + cell.y + " with reds");

                for(let j = 0; j < 4; j++){
                    iterateInDirection(j, (dx, dy)=>{
                        x = cell.x + dx;
                        y = cell.y + dy;
                        
                        if(inBounds(x, y, board) && board[x][y].color == 'blue'){
                            return true;
                        } else if(inBounds(x, y, board) && board[x][y].color == null){
                            board[x][y].color = 'red';
                            console.log("capped numCell: " + cell.x + ", " + cell.y + " with reds");
                            progressMade = true;
                        }
                        return false
                    })
                }
                
            }

        }

        //LOOP THROUGH ALL CELLS TO PLACE REDS THAT PREVENT OVERLOADING
        for(let x = 0; x < board.length; x++){
            for(let y = 0; y < board[x].length; y++){
                
            }
        }
    }

    console.log("progressMade: " + progressMade);

    if(!maxMoves || !progressMade){
        fillInReds(board);
    }

    solvability = countPercentFull(board);

    console.log(board);

    return {solvability: solvability, board: board};
}

//CONTROL

function initControls(){
    canvas.addEventListener('click', function(event) {

        let rect = canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;

        //console.log("clicked at: " + x + ", " + y);

        //find the cell that was clicked
        let circleRadius = (Math.min(viewSettings.boardWidthPx / (2 * gameBoard[0].length), viewSettings.boardHeightPx / (2 * gameBoard.length))) - viewSettings.padding;
        
        let clickedX = Math.floor((x - viewSettings.xOffset) / (circleRadius * 2 + viewSettings.padding));
        let clickedY = Math.floor((y - viewSettings.yOffset) / (circleRadius * 2 + viewSettings.padding));

        //console.log("clicked cell: " + clickedX + ", " + clickedY);
        
        //click is inbounds
        if(!inBounds(clickedX, clickedY, gameBoard)){
            return;
        }

        if(gameBoard[clickedX][clickedY].colorLocked){
            console.log("Cell is locked, sorry!");
            
            showLocks = !showLocks;
            render();
            
            return;
        }

        if(gameBoard[clickedX][clickedY].color == null){
            gameBoard[clickedX][clickedY].color = 'blue';

        } else if(gameBoard[clickedX][clickedY].color == 'blue'){
            gameBoard[clickedX][clickedY].color = 'red';

        } else {
            gameBoard[clickedX][clickedY].color = null;
        }

        changeMade();
    });

    //add spacebar listener
    document.addEventListener('keydown', function(event){
        if(event.key == " "){
            console.log("Solve step");
            let result = solve(gameBoard, 1);
            gameBoard = result.board;
            render();
        }
    });
}

function changeMade(){

    if(boardSolved()){
        console.log("SOLVED!!!");
        gameWon = true;
    }

    render();
}

function boardSolved(){
    for(let i = 0; i < gameBoard.length; i++){
        for(let j = 0; j < gameBoard[i].length; j++){
            if(gameBoard[i][j].color != solvedGameBoard[i][j].color){
                return false;
            }
        }
    }

    return true;
}



Main();