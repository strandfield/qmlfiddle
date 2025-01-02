cmake_minimum_required(VERSION 3.16)

project(qmlfiddle VERSION 0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.8 REQUIRED COMPONENTS Quick)

# https://doc.qt.io/qt-6/qt-standard-project-setup.html
qt_standard_project_setup(REQUIRES 6.8)

# Still needed even with qt_standard_project_setup().
# See https://doc.qt.io/qt-6/resources.html
set(CMAKE_AUTORCC ON)

qt_add_executable(qmlfiddle
    main.cpp
    qmlfiddle.qrc
)

## https://doc.qt.io/qt-6/wasm.html
#target_compile_options(qmlfiddle PRIVATE -s EXPORTED_RUNTIME_METHODS=ccall,cwrap)
#target_link_options(qmlfiddle PRIVATE -s EXPORTED_RUNTIME_METHODS=ccall,cwrap)
set_target_properties(qmlfiddle PROPERTIES QT_WASM_EXTRA_EXPORTED_METHODS "ccall,cwrap")

target_link_libraries(qmlfiddle
    PRIVATE Qt6::Quick
)

add_custom_command(TARGET qmlfiddle POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy "${CMAKE_BINARY_DIR}/qmlfiddle.js" "${CMAKE_CURRENT_LIST_DIR}/dist/qmlfiddle.js"
    COMMAND ${CMAKE_COMMAND} -E copy "${CMAKE_BINARY_DIR}/qmlfiddle.wasm" "${CMAKE_CURRENT_LIST_DIR}/dist/qmlfiddle.wasm"
)

install(TARGETS qmlfiddle
    LIBRARY DESTINATION "${CMAKE_CURRENT_LIST_DIR}/dist"
    RUNTIME DESTINATION "${CMAKE_CURRENT_LIST_DIR}/dist"
)

install(FILES 
    "${CMAKE_BINARY_DIR}/qmlfiddle.js"
    "${CMAKE_BINARY_DIR}/qmlfiddle.wasm"
    "${CMAKE_BINARY_DIR}/qtloader.js"
    "${CMAKE_BINARY_DIR}/qtlogo.svg"
    DESTINATION "${CMAKE_CURRENT_LIST_DIR}/dist"
)
