'use strict'

let gElCanvas
let gCtx
let gStartPos
let gFixedWidth = true
const STORAGE_KEY = 'Saved-Memes'

const TOUCH_EVS = ['touchstart', 'touchmove', 'touchend']

function onInit() {
    gElCanvas = document.querySelector('canvas')
    gCtx = gElCanvas.getContext('2d')

    addListeners()
    renderGallery()
    renderKeywords()
    renderStickerContainer()
    addColorPickerListeners()

    toggleSection('gallery-section')
    setActiveLink('gallery-section')

    resizeCanvas()
    renderMeme()
    insertMemeDataForm()
}

function addListeners() {
    addMouseListeners()
    addTouchListeners()

    window.addEventListener('resize', resizeCanvas)
    gElCanvas.addEventListener('click', onLineClick)
    gElCanvas.addEventListener('keydown', onKeyDown)
}

function addMouseListeners() {
    gElCanvas.addEventListener('mousedown', onDown)
    gElCanvas.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
}

function addTouchListeners() {
    gElCanvas.addEventListener('touchstart', onDown)
    gElCanvas.addEventListener('touchmove', onMove)
    document.addEventListener('touchend', onUp)
}

// Canvas

function resizeCanvas() {
    let elContainer = document.querySelector('.canvas-container')
    let width = elContainer.offsetWidth
    let height = elContainer.offsetWidth

    gElCanvas.width = width
    gElCanvas.height = height
    renderMeme()

}

function renderMeme() {
    let meme = getMemeData()
    renderFrameToLine()
    drawImg(meme)
}

function drawImg(meme) {
    const elImg = new Image()
    const { selectedImgId, lines } = meme

    const imgData = getImageToCanvas(+selectedImgId)

    if (!imgData) return
    elImg.src = imgData.url
    elImg.onload = () => {
        gCtx.clearRect(0, 0, gElCanvas.width, gElCanvas.height)

        if (gFixedWidth) gCtx.drawImage(elImg, 0, 0, gElCanvas.width, gElCanvas.height)
        else gCtx.drawImage(elImg, 0, 0, elImg.naturalWidth, elImg.naturalHeight)

        lines.forEach(line => {
            if (!line.url) {
                drawText(line)
            } else {
                drawSticker(line)
            }
        })
    }
}


function drawSticker(sticker) {
    const img = new Image()
    img.src = sticker.url
    img.onload = () => {
        const stickerWidth = sticker.size || img.width
        const stickerHeight = (img.height / img.width) * stickerWidth
        gCtx.drawImage(img, sticker.x - stickerWidth / 2, sticker.y - stickerHeight / 2, stickerWidth, stickerHeight)
    }
}

function drawText(line) {
    let { txt, size, font, fillColor, strokeColor, strokeWidth, align, x, y, rotation } = line

    gCtx.save()
    gCtx.translate(x, y)
    gCtx.rotate(rotation * Math.PI / 180) //rotation

    // Set text properties
    gCtx.font = `${size}px ${font}`
    gCtx.textAlign = align
    gCtx.textBaseline = 'middle'
    gCtx.lineWidth = strokeWidth
    gCtx.strokeStyle = strokeColor
    gCtx.fillStyle = fillColor

    gCtx.fillText(txt, 0, 0)
    gCtx.strokeText(txt, 0, 0)

    gCtx.restore() 

    renderFrameToLine()
}

// User Interactions

function onAddTxt(elMemeInput) {
    setLineTxt(elMemeInput.value)
    renderMeme()
}

function renderFrameToLine() {
    const memeData = getMemeData()
    const line = memeData.lines[memeData.selectedLineIdx]

    if (!line) return

    const { width, height } = getLineSize(line)
    const padding = 5
    let posX, posY

    if (line.url) {
        posX = line.x - width / 2 - padding
        posY = line.y - height / 2 - padding

        gCtx.strokeStyle = 'black'
        gCtx.strokeRect(posX, posY, width + padding * 2, height + padding * 2)

    } else {

        switch (line.align) {
            case 'left':
                posX = line.x - padding
                break
            case 'center':
                posX = line.x - width / 2 - padding
                break
            case 'right':
                posX = line.x - width - padding
                break
        }

        gCtx.strokeStyle = 'black'
        gCtx.strokeRect(posX, line.y - height / 2 - padding, width + padding * 2, height + padding * 2)
    }
}

function onOpenShareModal() {
    document.querySelector('.share-modal').showModal()
}

function onCloseShareModal() {
    document.querySelector('.share-modal').close()
}

function onDownloadMeme(elLink) {
    const meme = getMemeData()
    const imgData = getImageToCanvas(+meme.selectedImgId)
    const keywords = imgData.keywords.join('-')


    const dataUrl = gElCanvas.toDataURL()
    elLink.href = dataUrl

    elLink.download = `meme-${keywords}.png`
}

function onChangeFillColor(fillColor) {
    const memeData = getMemeData()
    memeData.lines[memeData.selectedLineIdx].fillColor = fillColor
    setMemeData({ lines: memeData.lines })
    renderMeme()
}

function onChangeStrokeColor(strokeColor) {
    const memeData = getMemeData()
    memeData.lines[memeData.selectedLineIdx].strokeColor = strokeColor
    setMemeData({ lines: memeData.lines })
    renderMeme()

}

function onSetFontFamily(font) {
    const memeData = getMemeData()
    memeData.lines[memeData.selectedLineIdx].font = font
    setMemeData({ lines: memeData.lines })
    renderMeme()

}

function onSetAlignment(align) {
    const memeData = getMemeData()
    const line = memeData.lines[memeData.selectedLineIdx]

    if (!line) return
    line.align = align

    setMemeData({ lines: memeData.lines })
    renderMeme()
}

function onUpdateLineSize(size) {
    const memeData = getMemeData()
    memeData.lines[memeData.selectedLineIdx].size += size
    setMemeData({ lines: memeData.lines })
    renderMeme()
}

function onAddLIne() {
    let elTextInput = document.querySelector('.meme-text-input')

    elTextInput.value = ''
    addLine()

    elTextInput = document.querySelector('.meme-text-input')
    onAddTxt({ value: 'Add text here' })

    insertMemeDataForm()
    renderMeme()
}

function onSwitch() {
    switchLine()
    insertMemeDataForm()
    renderMeme()
}


function onRotateLine() {
    rotateLine()
    insertMemeDataForm()
    renderMeme()
}

function onRemoveLine() {
    removeLine()
    insertMemeDataForm()
    renderMeme()
}

function onDown(ev) {
    const pos = getEvPos(ev)

    if (isLineClicked(pos)) {
        setLineDrag(true)
        gStartPos = pos
        document.body.style.cursor = 'grabbing'
        return
    }

    document.body.style.cursor = 'default'
}

function onMove(ev) {
    const pos = getEvPos(ev)

    const line = getLine()
    if (line.isDrag) {
        const dx = pos.x - gStartPos.x
        const dy = pos.y - gStartPos.y
        moveLine(line, dx, dy)
        gStartPos = pos
        renderMeme()

    }
}

function onUp() {
    setLineDrag(false)
    document.body.style.cursor = 'grab'
}

function onKeyDown(ev) {
    console.log('ev:', ev)
}

function onLineClick(ev) {
    const pos = getEvPos(ev)
    const memeData = getMemeData()
    const lines = memeData.lines

    const clickedLine = lines.find(line => {
        const { width, height } = getLineSize(line)
        const padding = 5

        const left = line.x - width / 2 - padding
        const right = line.x + width / 2 + padding
        const top = line.y - height / 2 - padding
        const bottom = line.y + height / 2 + padding

        return pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom
    })

    if (clickedLine) {
        const lineIdx = lines.indexOf(clickedLine)
        setSelectedLineIdx(lineIdx)
        insertMemeDataForm()
        renderMeme()
    }
}

// Utility 

function flashMsg(msg) {
    const el = document.querySelector('.user-msg')
    el.innerText = msg
    el.classList.add('open')
    setTimeout(() => el.classList.remove('open'), 2000)
}

function insertMemeDataForm() {

    const { selectedImgId, selectedLineIdx, lines } = getMemeData()

    if (lines.length <= 0) return

    const line = lines[selectedLineIdx]
    if (line.url) return

    document.querySelector('input[name="fill-color"]').value = lines[selectedLineIdx].fillColor
    document.querySelector('input[name="stroke-color"]').value = lines[selectedLineIdx].strokeColor
    document.querySelector('input[name="meme-text"]').value = lines[selectedLineIdx].txt
    document.querySelector('select[name="selected-font"]').value = lines[selectedLineIdx].font
}

function setSelectedLineIdx(idx) {
    const memeData = getMemeData()
    memeData.selectedLineIdx = idx
    setMemeData(memeData)
}

function getEvPos(ev) {
    let pos = {
        x: ev.offsetX,
        y: ev.offsetY,
    }

    if (TOUCH_EVS.includes(ev.type)) {
        //* Prevent triggering the mouse screen dragging event
        ev.preventDefault()
        //* Gets the first touch point
        ev = ev.changedTouches[0]
        //* Calc the right pos according to the touch screen
        pos = {
            x: ev.pageX - ev.target.offsetLeft - ev.target.clientLeft,
            y: ev.pageY - ev.target.offsetTop - ev.target.clientTop,
        }
    }
    return pos
}

function onSelectRandomMeme() {
    console.log('hello')
}

function onSavedInit() {
    toggleSection('saved-section')
    renderSavedMemes()
}

function onSaveMeme() {
    flashMsg('Meme Saved')
    saveMeme()
}

function renderSavedMemes() {
    const elSavedSection = document.querySelector('.saved-section')
    if (!gMemesSaved.length) return
    let strHTML = ''


    gMemesSaved.forEach(meme => {
        strHTML += `
        <article>
            <img src="${meme}" alt="saved-meme" class="meme-saved-item">
        </article>`
    })

    elSavedSection.innerHTML = strHTML
}

function onToggleImgSize(checkbox) {
    gFixedWidth = checkbox.checked

    let meme = getMemeData()
    drawImg(meme)

    const label = document.querySelector('label[for="imageMode"]')
    label.textContent = gFixedWidth ? 'Fixed' : 'Natural'
}