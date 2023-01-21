/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes"

let newBill
let inputFile
let inputFileGet

describe("Given I am connected as an employee", () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee'
    }))
  })
  describe("When I am on NewBill Page", () => {
    beforeAll(() => {
      document.body.innerHTML = NewBillUI()
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const store = null
      newBill = new NewBill({
        document, onNavigate, store, localStorage: window.localStorage
      })
    })
    test("Then form new bill is displayed", async () => {
      const formNewBill = await waitFor(() => screen.getByTestId('form-new-bill'))
      expect(formNewBill).toBeTruthy()
    })
    describe("Test method hasValidExtension(extension, validExtensions)", () => {
      it("should return true when extension is valid", () => {
        expect(newBill.hasValidExtension('jpg')).toEqual(true)
        expect(newBill.hasValidExtension('jpeg')).toEqual(true)
        expect(newBill.hasValidExtension('png')).toEqual(true)
      })
      it("should return false when extension is invalid", () => {
        expect(newBill.hasValidExtension('fake')).toEqual(false)
        expect(newBill.hasValidExtension('doc')).toEqual(false)
      })
    })
    describe("When i add a file", () => {
      beforeAll(async () => {
        inputFile = await waitFor(() => screen.getByTestId('file'))
        inputFileGet = jest.fn()
        Object.defineProperty(inputFile, 'files', {
          get: inputFileGet
        })
      })
      test("with an invalid extension then an error message is displayed and no file is created", async () => {
        inputFileGet.mockReturnValue([{
          name: 'file.doc',
          size: 12345,
          blob: 'some-blob'
        }])
        const createFile = jest.spyOn(newBill, 'createFile')

        fireEvent.change(inputFile)
        const errorExtension = await waitFor(() => screen.getByTestId('error-extension'))
        expect(errorExtension.classList.contains('show-error')).toBe(true)

        expect(createFile).not.toHaveBeenCalled()
      })
      test("with a valid extension then a new file is created", async () => {
        inputFileGet.mockReturnValue([{
          name: 'chucknorris.png',
          size: 12345,
          blob: 'some-blob'
        }])
        const createFile = jest.spyOn(newBill, 'createFile')

        fireEvent.change(inputFile)
        const errorExtension = await waitFor(() => screen.getByTestId('error-extension'))
        expect(errorExtension.classList.contains('hide-error')).toBe(true)
        expect(createFile).toHaveBeenCalled()
      })
    })
    describe("When i submit new bill form", () => {
      test("Then bill is upserted and i am redirected to bills page", async () => {
        const formNewBill = await waitFor(() => screen.getByTestId('form-new-bill'))

        const updateBill = jest.spyOn(newBill, 'updateBill')
        const onNavigate = jest.spyOn(newBill, 'onNavigate')

        fireEvent.submit(formNewBill)

        expect(updateBill).toHaveBeenCalled()
        expect(onNavigate).toHaveBeenCalled()
      })
    })
  })
  describe("Test API createFile method", () => {
    beforeAll(() => {
      jest.mock("../app/store", () => mockStore)
      jest.spyOn(mockStore, "bills")
      document.body.innerHTML = NewBillUI()
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const store = mockStore
      newBill = new NewBill({
        document, onNavigate, store, localStorage: window.localStorage
      })
    })
    test('POST data then get fileUrl and key', async () => {
      await newBill.createFile({})
      expect(newBill.fileUrl).toEqual('https://localhost:3456/images/test.jpg')
      expect(newBill.billId).toEqual('1234')
    })
    test("POST data to API and fails with 404 message error", async () => {

      mockStore.bills.mockImplementationOnce(() => {
        return {
          create: () => {
            return Promise.reject(new Error("Erreur 404"))
          }
        }
      })
      await expect(newBill.createFile({})).rejects.toEqual(new Error("Erreur 404"))
    })
    test("POST data to API and fails with 500 message error", async () => {

      mockStore.bills.mockImplementationOnce(() => {
        return {
          create: () => {
            return Promise.reject(new Error("Erreur 500"))
          }
        }
      })
      await expect(newBill.createFile({})).rejects.toEqual(new Error("Erreur 500"))
    })
  })
})
